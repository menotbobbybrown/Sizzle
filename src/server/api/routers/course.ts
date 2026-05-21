import { z } from "zod";
import { createTRPCRouter, creatorProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/lib/inngest";

export const courseRouter = createTRPCRouter({
  createModule: creatorProcedure
    .input(z.object({
      courseId: z.string(),
      title: z.string(),
      order: z.number(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.courseModule.create({
        data: input,
      });
    }),

  createLesson: creatorProcedure
    .input(z.object({
      moduleId: z.string(),
      title: z.string(),
      order: z.number(),
      content: z.string().optional(),
      videoUrl: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.lesson.create({
        data: input,
      });
    }),

  getCourseContent: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollment = await ctx.db.enrollment.findUnique({
        where: {
          userId_productId: {
            userId: ctx.session.user.id,
            productId: input.productId,
          },
        },
      });

      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled" });
      }

      return ctx.db.course.findUnique({
        where: { productId: input.productId },
        include: {
          modules: {
            include: {
              lessons: true,
            },
            orderBy: { order: "asc" },
          },
        },
      });
    }),

  updateProgress: protectedProcedure
    .input(z.object({
      enrollmentId: z.string(),
      lessonId: z.string(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const progress = await ctx.db.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: input.enrollmentId,
            lessonId: input.lessonId,
          },
        },
        update: { completed: input.completed },
        create: {
          enrollmentId: input.enrollmentId,
          lessonId: input.lessonId,
          completed: input.completed,
        },
      });

      if (input.completed) {
        const enrollment = await ctx.db.enrollment.findUnique({
          where: { id: input.enrollmentId },
          include: { 
            product: { 
              include: { 
                course: { 
                  include: { 
                    modules: { include: { lessons: true } } 
                  } 
                } 
              } 
            },
            progress: true
          }
        });

        if (enrollment?.product.course) {
          const totalLessons = enrollment.product.course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
          const completedLessons = enrollment.progress.filter(p => p.completed).length;

          if (completedLessons === totalLessons && !enrollment.completedAt) {
            await inngest.send({
              name: "course/completed",
              data: {
                enrollmentId: enrollment.id,
              }
            });
          }
        }
      }

      return progress;
    }),
});
