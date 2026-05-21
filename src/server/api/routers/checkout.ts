import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";
import { checkoutLimiter, checkRateLimit } from "@/lib/ratelimit";

export const checkoutRouter = createTRPCRouter({
  /**
   * Create a Stripe checkout session for a product
   */
  createSession: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        discountCode: z.string().optional(),
        customAmount: z.number().optional(),
        affiliateCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.req.headers.get("x-forwarded-for") ?? "127.0.0.1";
      const { success } = await checkRateLimit(checkoutLimiter, ip);
      if (!success) {
        throw new TRPCError({ 
          code: "TOO_MANY_REQUESTS", 
          message: "Too many checkout attempts. Please try again in a minute." 
        });
      }

      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: { 
          workspace: true,
          membershipConfig: true,
        },
      });

      if (!product || product.status !== "PUBLISHED") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      if (!product.workspace.stripeAccountId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This creator cannot accept payments yet.",
        });
      }

      let unitAmount = Math.round(Number(product.price) * 100);

      // PWYW pricing
      if (product.pricingType === "PWYW") {
        const amount = Number(input.customAmount);
        const minPrice = Number(product.minPrice) || 0;
        if (isNaN(amount) || amount < minPrice) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Minimum price is ${minPrice}`,
          });
        }
        unitAmount = Math.round(amount * 100);
      }

      // Apply discount if provided (only for fixed price products usually, but let's allow it)
      if (input.discountCode && product.pricingType !== "PWYW") {
        const discount = await ctx.db.discountCode.findUnique({
          where: { code: input.discountCode.toUpperCase() },
        });

        if (
          discount &&
          discount.isActive &&
          (!discount.maxUses || discount.usedCount < discount.maxUses) &&
          (!discount.expiresAt || discount.expiresAt > new Date()) &&
          (!discount.startsAt || discount.startsAt <= new Date())
        ) {
          if (discount.type === "PERCENTAGE") {
            unitAmount = Math.round(unitAmount * (1 - Number(discount.value) / 100));
          } else {
            unitAmount = Math.max(0, unitAmount - Number(discount.value) * 100);
          }
        }
      }

      const isSubscription = product.type === "MEMBERSHIP";
      const successUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product=${product.slug}`;
      const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?canceled=true`;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: product.currency.toLowerCase(),
              product_data: {
                name: product.name,
                images: product.imageUrl ? [product.imageUrl] : [],
              },
              unit_amount: unitAmount,
              ...(isSubscription && product.membershipConfig ? {
                recurring: {
                  interval: product.membershipConfig.interval.toLowerCase() as any,
                }
              } : {}),
            },
            quantity: 1,
          },
        ],
        mode: isSubscription ? "subscription" : "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: ctx.session?.user?.email ?? undefined,
        ...(isSubscription ? {} : {
          payment_intent_data: {
            transfer_data: {
              destination: product.workspace.stripeAccountId,
            },
          },
        }),
        subscription_data: isSubscription ? {
          transfer_data: {
            destination: product.workspace.stripeAccountId,
          },
          metadata: {
            productId: product.id,
            workspaceId: product.workspace.id,
            userId: ctx.session?.user?.id ?? "",
          }
        } : undefined,
        metadata: {
          productId: product.id,
          workspaceId: product.workspace.id,
          userId: ctx.session?.user?.id ?? "",
          discountCode: input.discountCode ?? "",
          affiliateCode: input.affiliateCode || "",
        },
      });

      return { url: session.url, sessionId: session.id };
    }),

  /**
   * Validate a discount code before checkout
   */
  validateDiscount: publicProcedure
    .input(
      z.object({
        code: z.string(),
        productId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const discount = await ctx.db.discountCode.findUnique({
        where: { code: input.code.toUpperCase() },
      });

      if (!discount) {
        return { valid: false, reason: "Invalid discount code" };
      }

      if (!discount.isActive) {
        return { valid: false, reason: "This discount code has been deactivated" };
      }

      if (discount.maxUses && discount.usedCount >= discount.maxUses) {
        return { valid: false, reason: "This discount code has reached its usage limit" };
      }

      if (discount.expiresAt && discount.expiresAt < new Date()) {
        return { valid: false, reason: "This discount code has expired" };
      }

      if (discount.startsAt && discount.startsAt > new Date()) {
        return { valid: false, reason: "This discount code is not yet active" };
      }

      // Get product price
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        return { valid: false, reason: "Product not found" };
      }

      const originalPrice = Number(product.price);
      let discountAmount: number;
      let finalPrice: number;

      if (discount.type === "PERCENTAGE") {
        discountAmount = (originalPrice * Number(discount.value)) / 100;
        finalPrice = originalPrice - discountAmount;
      } else {
        discountAmount = Number(discount.value);
        finalPrice = Math.max(0, originalPrice - discountAmount);
      }

      return {
        valid: true,
        code: discount.code,
        type: discount.type,
        value: Number(discount.value),
        discountAmount: Math.round(discountAmount * 100) / 100,
        originalPrice,
        finalPrice: Math.round(finalPrice * 100) / 100,
      };
    }),

  /**
   * Verify order after successful checkout
   */
  verifyOrder: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);

        if (session.payment_status !== "paid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment not completed",
          });
        }

        const order = await ctx.db.order.findUnique({
          where: { stripeSessionId: session.id },
          include: {
            items: { include: { product: true } },
            workspace: true,
          },
        });

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }

        return {
          orderId: order.id,
          status: order.status,
          amount: Number(order.amount),
          currency: order.currency,
          products: order.items.map((item) => ({
            id: item.product.id,
            name: item.product.name,
            type: item.product.type,
          })),
          customerEmail: session.customer_email,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify order",
        });
      }
    }),
});
