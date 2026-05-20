import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";

export const checkoutRouter = createTRPCRouter({
  /**
   * Create a Stripe checkout session for a product
   */
  createSession: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        discountCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: { workspace: true },
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

      // Apply discount if provided
      if (input.discountCode) {
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
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: ctx.session?.user?.email ?? undefined,
        metadata: {
          productId: product.id,
          workspaceId: product.workspace.id,
          userId: ctx.session?.user?.id ?? "anonymous",
          discountCode: input.discountCode ?? "",
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
          accessUrl: `${env.NEXT_PUBLIC_APP_URL}/download/${session.metadata?.accessToken ?? ""}`,
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