import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";

export const analyticsRouter = createTRPCRouter({
  getOverview: creatorProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [recentOrders, dailyAnalytics] = await Promise.all([
      ctx.db.order.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["PAID", "FULFILLED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      ctx.db.analyticsDaily.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // Fallback if workspace aggregates are not yet updated
    const totalRevenue = ctx.workspace.totalRevenue ?? 0;
    const totalSales = ctx.workspace.totalSales ?? 0;

    return {
      orders: recentOrders,
      totalRevenue,
      totalSales,
      orderCount: recentOrders.length,
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
    // Try to aggregate from AnalyticsDaily first
    const recentAnalytics = await ctx.db.analyticsDaily.findMany({
      where: {
        workspaceId: ctx.workspace.id,
      },
      orderBy: { date: "desc" },
      take: 30,
    });

    if (recentAnalytics.length > 0) {
      const productMap = new Map<string, { name: string; revenue: number; orders: number }>();

      for (const day of recentAnalytics) {
        const topProducts = (day.topProducts as any[]) || [];
        for (const p of topProducts) {
          const existing = productMap.get(p.productId) ?? {
            name: p.name,
            revenue: 0,
            orders: 0,
          };
          existing.revenue += Number(p.revenue || 0);
          existing.orders += (p.orders || 0);
          productMap.set(p.productId, existing);
        }
      }

      if (productMap.size > 0) {
        return Array.from(productMap.entries())
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);
      }
    }

    // Fallback to order scan if no analytics data exists
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
      take: 500, // Safety limit
    });

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
