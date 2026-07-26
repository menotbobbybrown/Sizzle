import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  creatorProcedure,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

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
   * Create a review. Requires authentication and a verified purchase, and is
   * limited to one review per user per product. New reviews start PENDING so the
   * creator can moderate them before they appear on the storefront.
   */
  create: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        rating: z.number().int().min(1).max(5),
        content: z.string().min(10).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the reviewer actually bought (or is enrolled in) the product.
      const [purchased, enrolled] = await Promise.all([
        ctx.db.orderItem.findFirst({
          where: {
            productId: input.productId,
            order: { userId, status: { in: ["PAID", "FULFILLED"] } },
          },
          select: { id: true },
        }),
        ctx.db.enrollment.findUnique({
          where: { userId_productId: { userId, productId: input.productId } },
          select: { id: true },
        }),
      ]);

      if (!purchased && !enrolled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only review products you have purchased",
        });
      }

      // One review per user per product.
      const existing = await ctx.db.review.findFirst({
        where: { productId: input.productId, userId },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already reviewed this product",
        });
      }

      return ctx.db.review.create({
        data: {
          productId: input.productId,
          userId,
          rating: input.rating,
          content: input.content,
          status: "PENDING",
        },
      });
    }),

  /**
   * Moderate a review (approve/reject). Scoped to the creator's own products.
   */
  moderate: creatorProcedure
    .input(
      z.object({
        reviewId: z.string(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.review.findFirst({
        where: {
          id: input.reviewId,
          product: { workspaceId: ctx.workspace.id },
        },
        select: { id: true },
      });

      if (!review) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
      }

      return ctx.db.review.update({
        where: { id: input.reviewId },
        data: { status: input.status },
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