import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { generateToken, hashToken, DEFAULT_TOKEN_CONFIG } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const existingEvent = await db.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });

  if (existingEvent?.status === "PROCESSED") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  const webhookEvent = await db.webhookEvent.upsert({
    where: { stripeEventId: event.id },
    update: {},
    create: {
      stripeEventId: event.id,
      type: event.type,
      status: "PENDING",
    },
  });

  try {
    const data = event.data.object as any;

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(data);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(data);
        break;
      case "charge.refunded":
        await handleChargeRefunded(data);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(data);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(data);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(data);
        break;
    }

    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

  } catch (error) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "FAILED" },
    });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: any) {
  const { productId, workspaceId, userId, discountCode, affiliateCode } = session.metadata ?? {};
  
  const existingOrder = await db.order.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existingOrder) return existingOrder;

  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const amount = session.amount_total / 100;
  const currency = session.currency.toUpperCase();

  let affiliateLinkId = null;
  let affiliateCommission = null;
  if (affiliateCode) {
    const affiliate = await db.affiliateLink.findUnique({
      where: { code: affiliateCode },
    });
    if (affiliate && affiliate.isActive) {
      affiliateLinkId = affiliate.id;
      affiliateCommission = (amount * Number(affiliate.commission)) / 100;
    }
  }

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
      affiliateLinkId,
      affiliateCommission,
      ...(discountCode
        ? {
            discountCode: {
              connect: { code: discountCode.toUpperCase() },
            },
          }
        : {}),
    },
  });

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

      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);

      await db.accessToken.create({
        data: {
          tokenHash,
          orderId: order.id,
          productId,
          maxUses: DEFAULT_TOKEN_CONFIG.maxUses,
          expiresAt: new Date(Date.now() + DEFAULT_TOKEN_CONFIG.expiresInHours * 60 * 60 * 1000),
        },
      });

      if (product.type === "COURSE" && userId) {
        await db.enrollment.upsert({
          where: { userId_productId: { userId, productId } },
          update: { status: "ACTIVE" },
          create: { userId, productId, status: "ACTIVE" },
        });
      }
    }
  }

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

  if (discountCode) {
    await db.discountCode.update({
      where: { code: discountCode.toUpperCase() },
      data: { usedCount: { increment: 1 } },
    });
  }

  await inngest.send({
    name: "shop/order.paid",
    data: {
      orderId: order.id,
      sessionId: session.id,
    },
  });

  return order;
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
      data: { status: "REFUNDED" },
    });

    await db.accessToken.updateMany({
      where: { orderId: payment.orderId },
      data: { revokedAt: new Date() },
    });
  }
}

async function handleSubscriptionCreatedOrUpdated(sub: any) {
  const { workspaceId, userId, productId } = sub.metadata ?? {};
  if (!workspaceId || !userId || !productId) return;

  await db.memberSubscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      workspaceId,
      productId,
      stripeSubscriptionId: sub.id,
      status: sub.status.toUpperCase(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      status: sub.status.toUpperCase(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(sub: any) {
  await db.memberSubscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: "CANCELED",
    },
  });
}

async function handleInvoicePaymentFailed(invoice: any) {
  if (invoice.subscription) {
    await db.memberSubscription.updateMany({
      where: { stripeSubscriptionId: invoice.subscription },
      data: {
        status: "PAST_DUE",
      },
    });
  }
}
