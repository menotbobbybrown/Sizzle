import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const storefrontRouter = createTRPCRouter({
  getStore: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findUnique({
        where: { handle: input.handle },
        include: {
          products: {
            where: { status: "PUBLISHED" },
          },
          storefront: true,
        },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }

      return workspace;
    }),

  getProduct: publicProcedure
    .input(z.object({ handle: z.string(), productSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: {
          slug: input.productSlug,
          workspace: { handle: input.handle },
          status: "PUBLISHED",
        },
        include: {
          workspace: true,
          course: {
            include: {
              modules: {
                include: { lessons: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return product;
    }),
});