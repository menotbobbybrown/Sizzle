import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";

/**
 * Assert that a course belongs to the caller's workspace (via its product) and
 * return it. Throws NOT_FOUND otherwise so we never leak other creators' courses.
 */
async function assertCourseInWorkspace(courseId: string, workspaceId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, product: { workspaceId } },
    select: { id: true },
  });
  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }
  return course;
}

/** Assert a module belongs to the caller's workspace and return it. */
async function assertModuleInWorkspace(moduleId: string, workspaceId: string) {
  const mod = await db.courseModule.findFirst({
    where: { id: moduleId, course: { product: { workspaceId } } },
    select: { id: true, courseId: true },
  });
  if (!mod) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
  }
  return mod;
}

export const moduleRouter = createTRPCRouter({
  list: creatorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCourseInWorkspace(input.courseId, ctx.workspace.id);

      return ctx.db.courseModule.findMany({
        where: { courseId: input.courseId },
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
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
      await assertCourseInWorkspace(input.courseId, ctx.workspace.id);

      return ctx.db.courseModule.create({
        data: {
          courseId: input.courseId,
          title: input.title,
          order: input.order,
        },
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
      await assertModuleInWorkspace(input.id, ctx.workspace.id);

      return ctx.db.courseModule.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
        },
      });
    }),

  delete: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertModuleInWorkspace(input.id, ctx.workspace.id);

      // Lessons cascade-delete via the schema relation.
      await ctx.db.courseModule.delete({ where: { id: input.id } });
      return { success: true };
    }),

  reorder: creatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        moduleIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertCourseInWorkspace(input.courseId, ctx.workspace.id);

      // Ensure every id really belongs to this course before renumbering.
      const owned = await ctx.db.courseModule.findMany({
        where: { courseId: input.courseId, id: { in: input.moduleIds } },
        select: { id: true },
      });
      if (owned.length !== input.moduleIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more modules do not belong to this course",
        });
      }

      await ctx.db.$transaction(
        input.moduleIds.map((id, index) =>
          ctx.db.courseModule.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      return { success: true };
    }),
});
