import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { generateToken, hashToken, DEFAULT_TOKEN_CONFIG } from "@/lib/tokens";
import { env } from "@/env";

/** Build a fresh, single-use access link for each product on an order. */
async function issueAccessLinks(
  orderId: string,
  items: Array<{ productId: string; product: { name: string } }>
): Promise<Array<{ name: string; url: string }>> {
  const links: Array<{ name: string; url: string }> = [];

  for (const item of items) {
    const rawToken = generateToken();
    await db.accessToken.create({
      data: {
        tokenHash: hashToken(rawToken),
        orderId,
        productId: item.productId,
        maxUses: DEFAULT_TOKEN_CONFIG.maxUses,
        expiresAt: new Date(
          Date.now() + DEFAULT_TOKEN_CONFIG.expiresInHours * 60 * 60 * 1000
        ),
      },
    });
    links.push({
      name: item.product.name,
      url: `${env.NEXT_PUBLIC_APP_URL}/api/access/${rawToken}`,
    });
  }

  return links;
}

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

      if (order.status === "REFUNDED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot resend delivery for a refunded order",
        });
      }

      // We only ever store hashed tokens, so a resend mints fresh single-use
      // links rather than recovering the originals.
      const links = await issueAccessLinks(order.id, order.items);

      if (links.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order has no deliverable items",
        });
      }

      const subject = `Your access link${links.length > 1 ? "s" : ""} for ${
        order.items[0]?.product.name ?? "your purchase"
      }`;

      const linksHtml = links
        .map(
          (l) =>
            `<p style="margin:12px 0;"><a href="${l.url}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;">Access ${l.name}</a></p>`
        )
        .join("");

      await sendEmail({
        to: order.customerEmail,
        subject,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
    <tr><td>
      <h1 style="font-size:20px;margin:0 0 8px;">Here ${links.length > 1 ? "are your links" : "is your link"}</h1>
      <p style="color:#71717a;margin:0 0 16px;">Each link is single-use and expires soon, so download promptly.</p>
      ${linksHtml}
    </td></tr>
  </table>
</body>
</html>`,
        tags: [
          { name: "orderId", value: order.id },
          { name: "type", value: "resend_delivery" },
        ],
      });

      // Log the email
      await ctx.db.emailLog.create({
        data: {
          orderId: order.id,
          to: order.customerEmail,
          subject,
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
   * Refund an order via Stripe and revoke access.
   *
   * The charge is a destination charge on the creator's connected account, so we
   * `reverse_transfer` (pull the funds back from the creator) and
   * `refund_application_fee` (return our platform fee to the buyer as well). The
   * `charge.refunded` webhook will also fire; both paths are idempotent.
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

      if (order.status === "REFUNDED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is already refunded" });
      }

      if (order.status !== "PAID" && order.status !== "FULFILLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only paid orders can be refunded",
        });
      }

      if (!order.stripePaymentIntentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No payment intent found for this order" });
      }

      // Actually move the money back to the customer.
      try {
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          reason: "requested_by_customer",
          reverse_transfer: true,
          refund_application_fee: true,
        });
      } catch (error) {
        console.error("Stripe refund failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Refund could not be processed by Stripe. Please try again.",
        });
      }

      // Reflect the refund locally and revoke any outstanding access. (The
      // webhook does the same; running both is safe.)
      await ctx.db.$transaction([
        ctx.db.order.update({
          where: { id: order.id },
          data: {
            status: "REFUNDED",
            refundedAt: new Date(),
            refundReason: input.reason ?? "Refunded by creator",
          },
        }),
        ctx.db.payment.updateMany({
          where: { orderId: order.id },
          data: { status: "REFUNDED" },
        }),
        ctx.db.accessToken.updateMany({
          where: { orderId: order.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      return { success: true };
    }),
});