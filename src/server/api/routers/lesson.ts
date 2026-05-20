import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, creatorProcedure, protectedProcedure } from "@/server/api/trpc";

// TODO: Implement lesson router fully

export const lessonRouter = createTRPCRouter({
  list: creatorProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "lesson.list - TODO: implement lesson listing",
      });
    }),

  create: creatorProcedure
    .input(
      z.object({
        moduleId: z.string(),
        title: z.string().min(1).max(200),
        content: z.string().optional(),
        lessonType: z.enum(["TEXT", "VIDEO", "EMBED", "QUIZ"]).default("TEXT"),
        order: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "lesson.create - TODO: implement lesson creation",
      });
    }),

  update: creatorProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().optional(),
        lessonType: z.enum(["TEXT", "VIDEO", "EMBED", "QUIZ"]).optional(),
        order: z.number().int().min(0).optional(),
        videoUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "lesson.update - TODO: implement lesson update",
      });
    }),

  delete: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "lesson.delete - TODO: implement lesson deletion",
      });
    }),

  // Student progress
  markComplete: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "lesson.markComplete - TODO: implement lesson progress tracking",
      });
    }),

  getProgress: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "lesson.getProgress - TODO: implement progress retrieval",
      });
    }),
});