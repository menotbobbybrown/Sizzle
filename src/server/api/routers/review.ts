import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, creatorProcedure, publicProcedure } from "@/server/api/trpc";

// TODO: Implement review router fully

export const reviewRouter = createTRPCRouter({
  /**
   * List reviews for a product (public)
   */
  list: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.review.findMany({
        where: { productId: input.productId, status: "APPROVED" },
        include: {
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.review.count({
        where: { productId: input.productId, status: "APPROVED" },
      });

      return { reviews, total };
    }),

  /**
   * Create a review (after purchase)
   */
  create: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        rating: z.number().int().min(1).max(5),
        content: z.string().min(10).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "review.create - TODO: implement review creation with purchase verification",
      });
    }),

  /**
   * Moderate review (approve/reject)
   */
  moderate: creatorProcedure
    .input(
      z.object({
        reviewId: z.string(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "review.moderate - TODO: implement review moderation",
      });
    }),

  /**
   * Get review stats
   */
  getStats: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const stats = await ctx.db.review.groupBy({
        by: ["rating"],
        where: { productId: input.productId, status: "APPROVED" },
        _count: true,
      });

      const total = stats.reduce((sum, s) => sum + s._count, 0);
      const average =
        stats.reduce((sum, s) => sum + s.rating * s._count, 0) / (total || 1);

      return {
        average: Math.round(average * 10) / 10,
        total,
        distribution: stats.map((s) => ({ rating: s.rating, count: s._count })),
      };
    }),
});