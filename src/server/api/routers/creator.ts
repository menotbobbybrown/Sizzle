import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure, creatorProcedure } from "@/server/api/trpc";
import { revalidateTag } from "@/lib/revalidate";
import { cache } from "@/lib/cache";

export const creatorRouter = createTRPCRouter({
  /**
   * Get creator profile by handle
   */
  getByHandle: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findUnique({
        where: { handle: input.handle },
        include: {
          products: {
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
          },
          storefront: true,
        },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
      }

      return workspace;
    }),

  /**
   * Get creator's products (public listing)
   */
  getProducts: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findUnique({
        where: { handle: input.handle },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
      }

      return ctx.db.product.findMany({
        where: { workspaceId: workspace.id, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Update creator profile (own workspace)
   */
  updateProfile: creatorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        logoUrl: z.string().url().optional().nullable(),
        bannerUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.workspace.update({
        where: { id: ctx.workspace.id },
        data: {
          name: input.name,
          bio: input.bio,
          logoUrl: input.logoUrl,
          bannerUrl: input.bannerUrl,
        },
      });

      // Revalidate
      revalidateTag(`storefront-${ctx.workspace.handle}`);
      await cache.invalidateStorefront(ctx.workspace.handle);

      return updated;
    }),

  /**
   * Connect Stripe account (OAuth flow)
   */
  connectStripe: creatorProcedure.mutation(async () => {
    return { url: "/api/stripe/connect" };
  }),

  /**
   * Get Stripe connection status
   */
  getStripeStatus: creatorProcedure.query(async ({ ctx }) => {
    const workspace = await ctx.db.workspace.findUnique({
      where: { id: ctx.workspace.id },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
      },
    });

    return {
      connected: !!workspace?.stripeAccountId,
      accountId: workspace?.stripeAccountId ?? null,
      status: workspace?.stripeAccountStatus ?? "disconnected",
    };
  }),

  /**
   * Get dashboard overview with stats
   */
  getDashboardOverview: creatorProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [orders, products, subscribers] = await Promise.all([
      ctx.db.order.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: { include: { product: true } },
        },
      }),
      ctx.db.product.findMany({
        where: { workspaceId: ctx.workspace.id },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { orderItems: true } },
        },
      }),
      ctx.db.subscriber.count({
        where: { workspaceId: ctx.workspace.id, status: "ACTIVE" },
      }),
    ]);

    // Calculate revenue
    const paidOrders = orders.filter((o) => o.status === "PAID" || o.status === "FULFILLED");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
    const orderCount = paidOrders.length;

    // Recent analytics
    const dailyAnalytics = await ctx.db.analyticsDaily.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
      take: 7,
    });

    return {
      revenue: totalRevenue,
      revenueChange: 0, // TODO: Calculate from previous period
      ordersThisMonth: orderCount,
      ordersChange: 0,
      activeProducts: products.filter((p) => p.status === "PUBLISHED").length,
      totalProducts: products.length,
      subscribers,
      subscriberChange: 0,
      recentOrders: orders,
      topProducts: products
        .filter((p) => p.status === "PUBLISHED")
        .sort((a, b) => b._count.orderItems - a._count.orderItems)
        .slice(0, 5),
      dailyAnalytics,
    };
  }),
});