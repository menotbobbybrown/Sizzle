import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, creatorProcedure } from "@/server/api/trpc";
import { hashToken } from "@/lib/tokens";

export const downloadRouter = createTRPCRouter({
  /**
   * Get download info by token (public - no auth required)
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const tokenHash = hashToken(input.token);

      const accessToken = await ctx.db.accessToken.findUnique({
        where: { tokenHash },
        include: {
          product: {
            include: {
              workspace: {
                select: { name: true, handle: true },
              },
            },
          },
          order: {
            select: {
              id: true,
              customerEmail: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (!accessToken) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired download link" });
      }

      // Check if revoked
      if (accessToken.revokedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This download link has been revoked" });
      }

      // Check expiration
      if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
        throw new TRPCError({ code: "GONE", message: "This download link has expired" });
      }

      // Check max uses
      if (accessToken.useCount >= accessToken.maxUses) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download limit reached" });
      }

      // Check order status
      if (accessToken.order.status !== "PAID" && accessToken.order.status !== "FULFILLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order not completed" });
      }

      return {
        productName: accessToken.product.name,
        productType: accessToken.product.type,
        workspaceName: accessToken.product.workspace.name,
        workspaceHandle: accessToken.product.workspace.handle,
        orderId: accessToken.order.id,
        purchaseDate: accessToken.order.createdAt,
        remainingUses: accessToken.maxUses - accessToken.useCount,
        expiresAt: accessToken.expiresAt,
        canDownload: true,
      };
    }),

  /**
   * Track download and increment use count
   */
  trackDownload: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = hashToken(input.token);

      const accessToken = await ctx.db.accessToken.findUnique({
        where: { tokenHash },
      });

      if (!accessToken) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid download token" });
      }

      if (accessToken.revokedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download link revoked" });
      }

      if (accessToken.useCount >= accessToken.maxUses) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download limit reached" });
      }

      // Increment use count and update last used
      await ctx.db.accessToken.update({
        where: { tokenHash },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return { success: true, useCount: accessToken.useCount + 1 };
    }),

  /**
   * Generate download URL (returns signed URL)
   * This would integrate with R2/S3 for actual file delivery
   */
  getDownloadUrl: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = hashToken(input.token);

      const accessToken = await ctx.db.accessToken.findUnique({
        where: { tokenHash },
        include: { product: true },
      });

      if (!accessToken) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid download token" });
      }

      if (accessToken.revokedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download link revoked" });
      }

      // TODO: Generate signed URL from R2/S3
      // For now, return a placeholder URL
      const downloadUrl = `/api/access/${input.token}/file`;

      return { url: downloadUrl, expiresIn: 300 }; // 5 minutes
    }),

  /**
   * List access tokens for an order (creator)
   */
  listByOrder: creatorProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId, workspaceId: ctx.workspace.id },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const tokens = await ctx.db.accessToken.findMany({
        where: { orderId: order.id },
        select: {
          id: true,
          maxUses: true,
          useCount: true,
          expiresAt: true,
          revokedAt: true,
          lastUsedAt: true,
          createdAt: true,
          product: { select: { name: true } },
        },
      });

      return tokens;
    }),

  /**
   * Revoke an access token
   */
  revoke: creatorProcedure
    .input(z.object({ tokenId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.db.accessToken.findUnique({
        where: { id: input.tokenId },
        include: {
          order: { select: { workspaceId: true } },
        },
      });

      if (!token) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
      }

      if (token.order.workspaceId !== ctx.workspace.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.accessToken.update({
        where: { id: input.tokenId },
        data: { revokedAt: new Date() },
      });

      return { success: true };
    }),
});