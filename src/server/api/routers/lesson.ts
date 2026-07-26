import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, creatorProcedure, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest";

/** Assert a module belongs to the caller's workspace. */
async function assertModuleInWorkspace(moduleId: string, workspaceId: string) {
  const mod = await db.courseModule.findFirst({
    where: { id: moduleId, course: { product: { workspaceId } } },
    select: { id: true },
  });
  if (!mod) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
  }
  return mod;
}

/** Assert a lesson belongs to the caller's workspace. */
async function assertLessonInWorkspace(lessonId: string, workspaceId: string) {
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, module: { course: { product: { workspaceId } } } },
    select: { id: true },
  });
  if (!lesson) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
  }
  return lesson;
}

export const lessonRouter = createTRPCRouter({
  list: creatorProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertModuleInWorkspace(input.moduleId, ctx.workspace.id);

      return ctx.db.lesson.findMany({
        where: { moduleId: input.moduleId },
        orderBy: { order: "asc" },
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
      await assertModuleInWorkspace(input.moduleId, ctx.workspace.id);

      return ctx.db.lesson.create({
        data: {
          moduleId: input.moduleId,
          title: input.title,
          content: input.content,
          lessonType: input.lessonType,
          order: input.order,
        },
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
      await assertLessonInWorkspace(input.id, ctx.workspace.id);

      return ctx.db.lesson.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.content !== undefined ? { content: input.content } : {}),
          ...(input.lessonType !== undefined ? { lessonType: input.lessonType } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
          ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
        },
      });
    }),

  delete: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLessonInWorkspace(input.id, ctx.workspace.id);

      await ctx.db.lesson.delete({ where: { id: input.id } });
      return { success: true };
    }),

  reorder: creatorProcedure
    .input(
      z.object({
        moduleId: z.string(),
        lessonIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertModuleInWorkspace(input.moduleId, ctx.workspace.id);

      // Every id must belong to this module before we renumber.
      const owned = await ctx.db.lesson.findMany({
        where: { moduleId: input.moduleId, id: { in: input.lessonIds } },
        select: { id: true },
      });
      if (owned.length !== input.lessonIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more lessons do not belong to this module",
        });
      }

      await ctx.db.$transaction(
        input.lessonIds.map((id, index) =>
          ctx.db.lesson.update({ where: { id }, data: { order: index } })
        )
      );

      return { success: true };
    }),

  // ── Student progress ────────────────────────────────────────────────

  markComplete: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Resolve the lesson's owning product so we can find the enrollment.
      const lesson = await ctx.db.lesson.findUnique({
        where: { id: input.lessonId },
        include: { module: { include: { course: true } } },
      });

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      const productId = lesson.module.course.productId;
      const courseId = lesson.module.courseId;

      const enrollment = await ctx.db.enrollment.findUnique({
        where: {
          userId_productId: { userId: ctx.session.user.id, productId },
        },
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not enrolled in this course",
        });
      }

      // Mark this lesson complete (idempotent).
      await ctx.db.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: enrollment.id,
            lessonId: input.lessonId,
          },
        },
        update: { completed: true },
        create: {
          enrollmentId: enrollment.id,
          lessonId: input.lessonId,
          completed: true,
        },
      });

      // Recompute overall progress across every lesson in the course.
      const [totalLessons, completedCount] = await Promise.all([
        ctx.db.lesson.count({ where: { module: { courseId } } }),
        ctx.db.lessonProgress.count({
          where: { enrollmentId: enrollment.id, completed: true },
        }),
      ]);

      const progressPercent =
        totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isComplete = totalLessons > 0 && completedCount >= totalLessons;
      const justCompleted = isComplete && enrollment.status !== "COMPLETED";

      await ctx.db.enrollment.update({
        where: { id: enrollment.id },
        data: {
          progressPercent,
          ...(justCompleted
            ? { status: "COMPLETED", completedAt: new Date() }
            : {}),
        },
      });

      // Kick off certificate/completion side effects exactly once.
      if (justCompleted) {
        await inngest.send({
          name: INNGEST_EVENTS.COURSE_COMPLETED,
          data: {
            enrollmentId: enrollment.id,
            userId: ctx.session.user.id,
            productId,
          },
        });
      }

      return { progressPercent, completed: isComplete };
    }),

  getProgress: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollment = await ctx.db.enrollment.findUnique({
        where: {
          userId_productId: {
            userId: ctx.session.user.id,
            productId: input.productId,
          },
        },
        include: { progress: true },
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not enrolled in this course",
        });
      }

      const completedLessonIds = new Set(
        enrollment.progress.filter((p) => p.completed).map((p) => p.lessonId)
      );

      const modules = await ctx.db.courseModule.findMany({
        where: { course: { productId: input.productId } },
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      });

      return {
        progressPercent: enrollment.progressPercent,
        status: enrollment.status,
        completedAt: enrollment.completedAt,
        modules: modules.map((m) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            lessonType: l.lessonType,
            completed: completedLessonIds.has(l.id),
          })),
        })),
      };
    }),
});
