import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";

export const checkoutRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(z.object({ productId: z.string() }))
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

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: product.currency.toLowerCase(),
              product_data: {
                name: product.name,
                images: product.imageUrl ? [product.imageUrl] : [],
              },
              unit_amount: Math.round(Number(product.price) * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?success=true`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?canceled=true`,
        metadata: {
          productId: product.id,
          workspaceId: product.workspace.id,
          userId: ctx.session?.user?.id ?? "anonymous",
        },
      });

      return { url: session.url };
    }),
});