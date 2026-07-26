import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, creatorProcedure } from "@/server/api/trpc";
import { hashToken } from "@/lib/tokens";
import { generateDownloadUrl } from "@/lib/r2";
import { env } from "@/env";

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
        throw new TRPCError({ code: "BAD_REQUEST", message: "This download link has expired" });
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

      if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Download link has expired" });
      }

      if (accessToken.useCount >= accessToken.maxUses) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download limit reached" });
      }

      // Atomic, race-safe consume: only increment if a slot is still free and
      // the token is still valid. If no row matches, someone else took the last use.
      const updated = await ctx.db.accessToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
          useCount: { lt: accessToken.maxUses },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download limit reached" });
      }

      return { success: true, useCount: accessToken.useCount + 1 };
    }),

  /**
   * Generate a short-lived signed download URL and atomically consume one use.
   * Returns a real R2 presigned URL for file products, or the enrollment URL for
   * courses — mirroring the `/api/access/[token]` route.
   */
  getDownloadUrl: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = hashToken(input.token);

      const accessToken = await ctx.db.accessToken.findUnique({
        where: { tokenHash },
        include: { product: { include: { workspace: true } } },
      });

      if (!accessToken) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid download token" });
      }

      if (accessToken.revokedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download link revoked" });
      }

      if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Download link has expired" });
      }

      if (accessToken.useCount >= accessToken.maxUses) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download limit reached" });
      }

      // Atomically consume one use before handing out the signed URL.
      const consumed = await ctx.db.accessToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
          useCount: { lt: accessToken.maxUses },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      });

      if (consumed.count === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Download limit reached" });
      }

      const expiresIn = 300; // 5 minutes

      if (accessToken.product.fileKey) {
        const url = await generateDownloadUrl(
          accessToken.product.fileKey,
          accessToken.product.fileName ?? accessToken.product.name,
          expiresIn
        );
        return { url, expiresIn };
      }

      if (accessToken.product.type === "COURSE") {
        return {
          url: `${env.NEXT_PUBLIC_APP_URL}/${accessToken.product.workspace.handle}?enroll=${accessToken.product.slug}`,
          expiresIn,
        };
      }

      throw new TRPCError({ code: "NOT_FOUND", message: "No downloadable file for this product" });
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