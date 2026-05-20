import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, creatorProcedure } from "@/server/api/trpc";

export const orderRouter = createTRPCRouter({
  /**
   * List orders for creator's workspace
   */
  list: creatorProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "PAID", "FULFILLED", "FAILED", "REFUNDED"]).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, limit = 20, offset = 0 } = input ?? {};

      const where = {
        workspaceId: ctx.workspace.id,
        ...(status ? { status } : {}),
      };

      const [orders, total] = await Promise.all([
        ctx.db.order.findMany({
          where,
          include: {
            items: { include: { product: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        ctx.db.order.count({ where }),
      ]);

      return { orders, total, hasMore: offset + orders.length < total };
    }),

  /**
   * Get single order by ID
   */
  getById: creatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.id, workspaceId: ctx.workspace.id },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, name: true, email: true } },
          payments: true,
          accessTokens: true,
          emails: true,
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      return order;
    }),

  /**
   * Resend delivery email for an order
   */
  resendDelivery: creatorProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId, workspaceId: ctx.workspace.id },
        include: {
          items: { include: { product: true } },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (!order.customerEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No customer email to send to" });
      }

      // Get the first access token
      const accessToken = await ctx.db.accessToken.findFirst({
        where: { orderId: order.id },
      });

      if (!accessToken) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No access token found for this order" });
      }

      // TODO: Send email with access link
      // await sendDeliveryEmail(order.customerEmail, accessToken.token, order.items);

      // Log the email
      await ctx.db.emailLog.create({
        data: {
          orderId: order.id,
          to: order.customerEmail,
          subject: `Access link for ${order.items[0]?.product.name ?? "your purchase"}`,
          template: "resend_delivery",
          status: "SENT",
        },
      });

      return { success: true };
    }),

  /**
   * Export orders as CSV
   */
  exportCSV: creatorProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "PAID", "FULFILLED", "FAILED", "REFUNDED"]).optional(),
          from: z.date().optional(),
          to: z.date().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.from || input?.to
            ? { createdAt: { gte: input?.from, lte: input?.to } }
            : {}),
        },
        include: {
          items: { include: { product: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Generate CSV
      const headers = ["Order ID", "Date", "Customer", "Email", "Product", "Amount", "Status", "Payment ID"];
      const rows = orders.map((o) => [
        o.id,
        o.createdAt.toISOString(),
        o.customerName ?? o.user?.name ?? "Unknown",
        o.customerEmail ?? o.user?.email ?? "",
        o.items.map((i) => i.product.name).join("; "),
        o.amount.toString(),
        o.status,
        o.stripePaymentIntentId ?? "",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      return { csv };
    }),

  /**
   * Refund an order (stub - Stripe refund integration)
   */
  refund: creatorProcedure
    .input(z.object({ orderId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId, workspaceId: ctx.workspace.id },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (!order.stripePaymentIntentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No payment intent found for this order" });
      }

      // TODO: Call Stripe refund API
      // const refund = await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });

      // Update order status
      await ctx.db.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });

      return { success: true };
    }),
});