import { z } from "zod";
import { createTRPCRouter, creatorProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const courseRouter = createTRPCRouter({
  /** List the workspace's course products with module/lesson counts. */
  listForCreator: creatorProcedure.query(async ({ ctx }) => {
    const products = await ctx.db.product.findMany({
      where: { workspaceId: ctx.workspace.id, type: "COURSE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        imageUrl: true,
        course: {
          select: {
            modules: { select: { _count: { select: { lessons: true } } } },
          },
        },
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      imageUrl: p.imageUrl,
      moduleCount: p.course?.modules.length ?? 0,
      lessonCount:
        p.course?.modules.reduce((sum, m) => sum + m._count.lessons, 0) ?? 0,
    }));
  }),

  /**
   * Load the full editable course tree for a course product the caller owns.
   * Ensures the backing Course row exists (defensive) and returns modules and
   * lessons in order.
   */
  getBuilder: creatorProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: {
          id: input.productId,
          workspaceId: ctx.workspace.id,
          type: "COURSE",
        },
        select: { id: true, name: true, slug: true },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const course = await ctx.db.course.upsert({
        where: { productId: product.id },
        update: {},
        create: { productId: product.id },
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: { lessons: { orderBy: { order: "asc" } } },
          },
        },
      });

      return { product, course };
    }),

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
      // Check enrollment
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
    .mutation(({ ctx, input }) => {
      return ctx.db.lessonProgress.upsert({
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
    }),
});
