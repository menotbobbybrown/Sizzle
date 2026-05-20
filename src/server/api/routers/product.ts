import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { ProductType, ProductStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const productRouter = createTRPCRouter({
  create: creatorProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      price: z.number().min(0),
      type: z.nativeEnum(ProductType),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check entitlements
      const productCount = await ctx.db.product.count({
        where: { tenantId: ctx.tenant.id },
      });

      if (productCount >= ctx.entitlements.maxProducts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Product limit reached for your plan.",
        });
      }

      return ctx.db.product.create({
        data: {
          tenantId: ctx.tenant.id,
          name: input.name,
          slug: input.slug,
          price: input.price,
          type: input.type,
        },
      });
    }),

  getAll: creatorProcedure.query(({ ctx }) => {
    return ctx.db.product.findMany({
      where: { tenantId: ctx.tenant.id },
    });
  }),
  
  getById: creatorProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.product.findUnique({
        where: { id: input.id, tenantId: ctx.tenant.id },
        include: {
          course: true,
          coaching: true,
          membership: true,
          digitalAsset: true,
          bundle: true,
        }
      });
    }),
    
  update: creatorProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      price: z.number().optional(),
      status: z.nativeEnum(ProductStatus).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.product.update({
        where: { id, tenantId: ctx.tenant.id },
        data,
      });
    }),
});
