import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { INNGEST_EVENTS } from "@/lib/inngest";
import { WorkspacePlan } from "@prisma/client";
import { revalidateTag } from "next/cache";

export const stripeWebhookHandler = inngest.createFunction(
  { id: "stripe-webhook-handler", name: "Stripe Webhook Handler" },
  { event: "stripe/event" },
  async ({ event, step }) => {
    const { type, event: stripeEvent } = event.data;
    const session = stripeEvent.data.object as any;

    const result = await step.run("Process Stripe Event", async () => {
      let workspaceId = null;
      // Logic from original webhook handler
      if (type === "checkout.session.completed") {
        workspaceId = (session.metadata as any)?.workspaceId;
        await handleCheckoutCompleted(session);
      } else if (type === "checkout.session.expired") {
        await handleCheckoutExpired(session);
      } else if (type === "charge.refunded") {
        await handleChargeRefunded(session);
      } else if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
        workspaceId = (session.metadata as any)?.workspaceId;
        await handleSubscriptionUpdated(session);
      } else if (type === "customer.subscription.deleted") {
        await handleSubscriptionDeleted(session);
      }

      // Mark event as processed in DB
      await db.webhookEvent.update({
        where: { eventId: stripeEvent.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      return { workspaceId };
    });

    // Revalidate storefront if workspaceId is known
    if (result.workspaceId) {
      await step.run("Revalidate Storefront", async () => {
        const workspace = await db.workspace.findUnique({
          where: { id: result.workspaceId },
          select: { handle: true },
        });
        if (workspace?.handle) {
          try {
            revalidateTag(`storefront-${workspace.handle}`);
          } catch (e) {
            console.error("Failed to revalidate tag in Inngest:", e);
          }
        }
      });
    }
  }
);

async function handleCheckoutCompleted(session: any) {
  const { productId, workspaceId, userId, discountCode } = session.metadata ?? {};
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const amount = session.amount_total / 100;
  const currency = session.currency.toUpperCase();

  // Create the order
  const order = await db.order.create({
    data: {
      workspaceId,
      userId: userId || null,
      isGuest: !userId,
      customerEmail,
      customerName,
      amount,
      currency,
      status: "PAID",
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      ...(discountCode
        ? {
            discountCode: {
              connect: { code: discountCode.toUpperCase() },
            },
          }
        : {}),
    },
  });

  // Update discount code usage
  if (discountCode) {
    await db.discountCode.update({
      where: { code: discountCode.toUpperCase() },
      data: { usedCount: { increment: 1 } },
    });
  }

  // Create order item and fulfill
  if (productId) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (product) {
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId,
          quantity: 1,
          unitPrice: product.price,
        },
      });

      // Update product/workspace stats
      await db.product.update({
        where: { id: productId },
        data: {
          totalSales: { increment: 1 },
          totalRevenue: { increment: amount },
        },
      });

      await db.workspace.update({
        where: { id: workspaceId },
        data: {
          totalSales: { increment: 1 },
          totalRevenue: { increment: amount },
        },
      });

      // Trigger post-purchase flow in Inngest for emails/notifications
      await inngest.send({
        name: INNGEST_EVENTS.ORDER_PAID,
        data: {
          orderId: order.id,
          workspaceId,
          userId,
          productId,
          amount,
        },
      });
    }
  }

  // Create payment record
  await db.payment.create({
    data: {
      orderId: order.id,
      stripePaymentIntentId: session.payment_intent,
      stripeSessionId: session.id,
      amount,
      currency,
      status: "SUCCEEDED",
    },
  });
}

async function handleCheckoutExpired(session: any) {
  const order = await db.order.findUnique({
    where: { stripeSessionId: session.id },
  });

  if (order && order.status === "PENDING") {
    await db.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
  }
}

async function handleChargeRefunded(session: any) {
  const paymentIntentId = session.payment_intent;
  if (!paymentIntentId) return;

  const payment = await db.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    });

    await db.order.update({
      where: { id: payment.orderId },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundReason: "Stripe Refund",
      },
    });

    // Revoke access tokens
    await db.accessToken.updateMany({
      where: { orderId: payment.orderId },
      data: { revokedAt: new Date() },
    });
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const { workspaceId, planId } = subscription.metadata ?? {};
  if (!workspaceId) return;

  const planMap: Record<string, WorkspacePlan> = {
    creator: "CREATOR",
    pro: "PRO",
    business: "BUSINESS",
  };

  const plan = planMap[planId] || "FREE";

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      plan,
      stripeSubscriptionId: subscription.id,
    },
  });
}

async function handleSubscriptionDeleted(session: any) {
  const subscriptionId = session.id;
  await db.workspace.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
    },
  });
}
