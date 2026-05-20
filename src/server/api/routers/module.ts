import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";

// TODO: Implement module router fully

export const moduleRouter = createTRPCRouter({
  list: creatorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "module.list - TODO: implement course module listing",
      });
    }),

  create: creatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1).max(200),
        order: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "module.create - TODO: implement course module creation",
      });
    }),

  update: creatorProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "module.update - TODO: implement course module update",
      });
    }),

  delete: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "module.delete - TODO: implement course module deletion",
      });
    }),

  reorder: creatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        moduleIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "module.reorder - TODO: implement course module reordering",
      });
    }),
});