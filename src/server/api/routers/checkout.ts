import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";

export const checkoutRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: { tenant: true },
      });

      if (!product || product.status !== "PUBLISHED") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      if (!product.tenant.stripeAccountId) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED", 
          message: "This creator cannot accept payments yet." 
        });
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: product.currency.toLowerCase(),
              product_data: {
                name: product.name,
                images: product.imageUrl ? [product.imageUrl] : [],
              },
              unit_amount: Number(product.price) * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${env.NEXTAUTH_URL}/c/${product.tenant.slug}/p/${product.slug}?success=true`,
        cancel_url: `${env.NEXTAUTH_URL}/c/${product.tenant.slug}/p/${product.slug}?canceled=true`,
        payment_intent_data: {
          application_fee_amount: Math.round(Number(product.price) * 0.05 * 100), // 5% fee example
          transfer_data: {
            destination: product.tenant.stripeAccountId,
          },
        },
        metadata: {
          productId: product.id,
          tenantId: product.tenant.id,
        },
      });

      return { url: session.url };
    }),
});
