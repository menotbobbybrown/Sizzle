import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { INNGEST_EVENTS } from "@/lib/inngest";
import { WorkspacePlan, type SubscriptionStatus } from "@prisma/client";
import { revalidateTag } from "@/lib/revalidate";

/** Map a Stripe subscription status to our `SubscriptionStatus` enum. */
function mapStripeSubStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "trialing":
      return "TRIALING";
    default:
      return "ACTIVE";
  }
}

export const stripeWebhookHandler = inngest.createFunction(
  { id: "stripe-webhook-handler", name: "Stripe Webhook Handler", triggers: [{ event: "stripe/event" }] },
  async ({ event, step }) => {
    const { type, event: stripeEvent } = event.data;
    const session = stripeEvent.data.object as any;

    const result = await step.run("Process Stripe Event", async () => {
      let workspaceId = null;
      // Logic from original webhook handler
      if (type === "checkout.session.completed") {
        workspaceId = (session.metadata as any)?.workspaceId;
        // A subscription-mode checkout tagged as a membership is a creator's
        // recurring product, not a one-time sale or a platform-plan upgrade.
        if (
          session.mode === "subscription" &&
          (session.metadata as any)?.kind === "membership"
        ) {
          await handleMembershipCheckout(session);
        } else {
          await handleCheckoutCompleted(session);
        }
      } else if (type === "checkout.session.expired") {
        await handleCheckoutExpired(session);
      } else if (type === "charge.refunded") {
        await handleChargeRefunded(session);
      } else if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
        workspaceId = (session.metadata as any)?.workspaceId;
        await handleSubscriptionUpdated(session);
      } else if (type === "customer.subscription.deleted") {
        await handleSubscriptionDeleted(session);
      } else if (type === "invoice.payment_failed") {
        await handleInvoicePaymentFailed(session);
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

  // Idempotency: Stripe delivers webhooks at least once, so the same
  // `checkout.session.completed` can arrive twice. `Order.stripeSessionId` is
  // unique, and letting the insert throw would mark the whole webhook FAILED
  // and trigger endless Stripe retries. Instead we short-circuit cleanly if the
  // order already exists.
  const existingOrder = await db.order.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existingOrder) {
    return;
  }

  // Create the order (fully checked create so relations and scalar FKs don't mix)
  const order = await db.order.create({
    data: {
      isGuest: !userId,
      customerEmail,
      customerName,
      amount,
      currency,
      status: "PAID",
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      workspace: { connect: { id: workspaceId } },
      ...(userId ? { user: { connect: { id: userId } } } : {}),
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
  // Creator membership subscriptions and Sizzle platform-plan subscriptions
  // both arrive here; the `kind` metadata tells them apart.
  if (subscription.metadata?.kind === "membership") {
    await syncMembershipSubscription(subscription);
    return;
  }

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

async function handleSubscriptionDeleted(subscription: any) {
  const subscriptionId = subscription.id;

  // If it's a creator membership, cancel it and stop access.
  const membership = await db.memberSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (membership) {
    await db.memberSubscription.update({
      where: { id: membership.id },
      data: { status: "CANCELED", cancelAtPeriodEnd: false },
    });
    return;
  }

  // Otherwise it's a platform-plan subscription → drop the workspace to FREE.
  await db.workspace.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
    },
  });
}

/** Initial creator-membership purchase (subscription-mode checkout). */
async function handleMembershipCheckout(session: any) {
  const { productId, workspaceId, userId } = session.metadata ?? {};
  const stripeSubscriptionId = session.subscription as string | undefined;

  // Memberships are tied to a known account (userId) and a Stripe subscription.
  if (!productId || !workspaceId || !userId || !stripeSubscriptionId) return;

  // Idempotency — Stripe delivers at least once.
  const existing = await db.memberSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (existing) return;

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return;

  const sub: any = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const currentPeriodStart = new Date(sub.current_period_start * 1000);
  const currentPeriodEnd = new Date(sub.current_period_end * 1000);

  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency ?? "usd").toUpperCase();

  // Record the initial charge as an order (idempotent on the session id).
  const existingOrder = await db.order.findUnique({
    where: { stripeSessionId: session.id },
  });
  const order =
    existingOrder ??
    (await db.order.create({
      data: {
        isGuest: false,
        customerEmail,
        customerName,
        amount,
        currency,
        status: "PAID",
        stripeSessionId: session.id,
        workspace: { connect: { id: workspaceId } },
        user: { connect: { id: userId } },
        items: {
          create: { productId, quantity: 1, unitPrice: product.price },
        },
      },
    }));

  await db.payment.create({
    data: {
      orderId: order.id,
      stripeSessionId: session.id,
      amount,
      currency,
      status: "SUCCEEDED",
    },
  });

  const membership = await db.memberSubscription.create({
    data: {
      userId,
      productId,
      status: mapStripeSubStatus(sub.status),
      stripeSubscriptionId,
      currentPeriodStart,
      currentPeriodEnd,
    },
  });

  // Sales stats.
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

  // Send the membership welcome email (SUBSCRIPTION_CREATED flow), rather than
  // the one-time receipt flow which builds a file-download link memberships
  // don't have.
  await inngest.send({
    name: INNGEST_EVENTS.SUBSCRIPTION_CREATED,
    data: { subscriptionId: membership.id, userId, workspaceId },
  });
}

/** Keep a membership row in sync on renewal / status change. */
async function syncMembershipSubscription(subscription: any) {
  const membership = await db.memberSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!membership) return;

  await db.memberSubscription.update({
    where: { id: membership.id },
    data: {
      status: mapStripeSubStatus(subscription.status),
      cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
      ...(subscription.current_period_start
        ? { currentPeriodStart: new Date(subscription.current_period_start * 1000) }
        : {}),
      ...(subscription.current_period_end
        ? { currentPeriodEnd: new Date(subscription.current_period_end * 1000) }
        : {}),
    },
  });
}

/** A failed renewal invoice marks the membership past due (dunning). */
async function handleInvoicePaymentFailed(invoice: any) {
  const stripeSubscriptionId = invoice.subscription as string | undefined;
  if (!stripeSubscriptionId) return;

  const membership = await db.memberSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (membership) {
    await db.memberSubscription.update({
      where: { id: membership.id },
      data: { status: "PAST_DUE" },
    });
  }
}
