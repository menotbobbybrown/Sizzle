import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { ProductType, ProductStatus } from "@prisma/client";

export const productRouter = createTRPCRouter({
  create: creatorProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      price: z.number().min(0),
      type: z.nativeEnum(ProductType),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.product.create({
        data: {
          workspaceId: ctx.workspace.id,
          name: input.name,
          slug: input.slug,
          price: input.price,
          type: input.type,
        },
      });
    }),

  getAll: creatorProcedure.query(({ ctx }) => {
    return ctx.db.product.findMany({
      where: { workspaceId: ctx.workspace.id },
    });
  }),
  
  getById: creatorProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.product.findUnique({
        where: { id: input.id, workspaceId: ctx.workspace.id },
        include: {
          course: true,
        },
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
        where: { id, workspaceId: ctx.workspace.id },
        data,
      });
    }),
});
