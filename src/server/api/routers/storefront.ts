import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const storefrontRouter = createTRPCRouter({
  getStore: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where: { slug: input.slug },
        include: {
          products: {
            where: { status: "PUBLISHED" },
          },
        },
      });

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }

      return tenant;
    }),

  getProduct: publicProcedure
    .input(z.object({ tenantSlug: z.string(), productSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: {
          slug: input.productSlug,
          tenant: { slug: input.tenantSlug },
          status: "PUBLISHED",
        },
        include: {
          tenant: true,
        },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return product;
    }),
});
