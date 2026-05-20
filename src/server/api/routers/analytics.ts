import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";

export const analyticsRouter = createTRPCRouter({
  getOverview: creatorProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [orders, totalRevenue, dailyAnalytics] = await Promise.all([
      ctx.db.order.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["PAID", "FULFILLED"] },
        },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.order.aggregate({
        where: {
          workspaceId: ctx.workspace.id,
          status: { in: ["PAID", "FULFILLED"] },
        },
        _sum: { amount: true },
      }),
      ctx.db.analyticsDaily.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    return {
      orders,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      orderCount: orders.length,
      dailyAnalytics,
    };
  }),

  getDaily: creatorProcedure
    .input(
      z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const to = input.to ?? new Date();
      const from = input.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

      return ctx.db.analyticsDaily.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          date: { gte: from, lte: to },
        },
        orderBy: { date: "asc" },
      });
    }),

  getTopProducts: creatorProcedure.query(async ({ ctx }) => {
    const orders = await ctx.db.order.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        status: { in: ["PAID", "FULFILLED"] },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<string, { name: string; revenue: number; orders: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const existing = productMap.get(item.productId) ?? {
          name: item.product.name,
          revenue: 0,
          orders: 0,
        };
        existing.revenue += Number(item.unitPrice) * item.quantity;
        existing.orders += item.quantity;
        productMap.set(item.productId, existing);
      }
    }

    return Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }),
});