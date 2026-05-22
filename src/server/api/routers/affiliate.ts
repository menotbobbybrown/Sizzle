import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";

export const affiliateRouter = createTRPCRouter({
  /**
   * Create a new affiliate link for the workspace
   */
  createLink: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        commission: z.number().min(0).max(100).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.workspaceMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Generate unique code
      const code = randomBytes(4).toString("base64url").slice(0, 8);

      const link = await ctx.db.affiliateLink.create({
        data: {
          workspaceId: membership.workspaceId,
          userId: ctx.session.user.id,
          code,
          name: input.name,
          commission: input.commission,
          isActive: true,
        },
      });

      return link;
    }),

  /**
   * List all affiliate links for the workspace
   */
  listLinks: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.workspaceMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          workspaceId: input.workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const links = await ctx.db.affiliateLink.findMany({
        where: {
          workspaceId: input.workspaceId,
        },
        orderBy: { createdAt: "desc" },
      });

      return links;
    }),

  /**
   * Toggle affiliate link active status
   */
  toggleLink: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.db.affiliateLink.findUnique({
        where: { id: input.linkId },
      });

      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      // Verify user owns this link or is workspace admin
      const membership = await ctx.db.workspaceMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          workspaceId: link.workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });

      if (!membership && link.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.affiliateLink.update({
        where: { id: input.linkId },
        data: { isActive: input.isActive },
      });
    }),

  /**
   * Get affiliate stats for a link
   */
  getLinkStats: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.affiliateLink.findUnique({
        where: { id: input.linkId },
        include: {
          orders: {
            where: { status: "PAID" },
            select: {
              id: true,
              amount: true,
              createdAt: true,
            },
          },
          clicks: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
      });

      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      // Verify user has access
      const membership = await ctx.db.workspaceMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          workspaceId: link.workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });

      if (!membership && link.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Calculate stats
      const totalSales = link.orders.length;
      const totalRevenue = link.orders.reduce(
        (sum, order) => sum + Number(order.amount),
        0
      );
      const commissionOwed = totalRevenue * (Number(link.commission) / 100);

      return {
        ...link,
        stats: {
          clickCount: link.clickCount,
          conversionCount: link.conversionCount,
          totalSales,
          totalRevenue,
          commissionOwed,
        },
      };
    }),

  /**
   * Track affiliate click
   */
  trackClick: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.db.affiliateLink.findUnique({
        where: { code: input.code },
      });

      if (!link || !link.isActive) {
        return { tracked: false };
      }

      // Create click record
      await ctx.db.affiliateClick.create({
        data: {
          linkId: link.id,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
        },
      });

      // Increment click count
      await ctx.db.affiliateLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      });

      return { tracked: true, linkId: link.id };
    }),

  /**
   * Attribute an order to an affiliate link
   */
  attributeOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        linkCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.linkCode) {
        return { attributed: false };
      }

      const link = await ctx.db.affiliateLink.findUnique({
        where: { code: input.linkCode },
      });

      if (!link || !link.isActive) {
        return { attributed: false };
      }

      // Update order with affiliate link
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: { affiliateLinkId: link.id },
      });

      // Update conversion count
      await ctx.db.affiliateLink.update({
        where: { id: link.id },
        data: { conversionCount: { increment: 1 } },
      });

      return { attributed: true, linkId: link.id };
    }),
});