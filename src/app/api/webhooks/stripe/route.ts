import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { generateToken, hashToken, DEFAULT_TOKEN_CONFIG } from "@/lib/tokens";
import { type WorkspacePlan } from "@prisma/client";

/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe payment events:
 * - checkout.session.completed (payment successful)
 * - checkout.session.expired (payment abandoned)
 * - charge.refunded (refund processed)
 * 
 * All events are idempotent - duplicate events are safely ignored.
 */
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

  // Idempotency check - have we already processed this event?
  const existingEvent = await db.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });

  if (existingEvent?.status === "PROCESSED") {
    console.log(`[Stripe Webhook] Duplicate event ${event.id} - skipping`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Record the event
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
    const session = event.data.object as any;
    console.log(`[Stripe Webhook] Processing: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(session);
    }

    if (event.type === "checkout.session.expired") {
      await handleCheckoutExpired(session);
    }

    if (event.type === "charge.refunded") {
      await handleChargeRefunded(session);
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      await handleSubscriptionUpdated(session);
    }

    if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(session);
    }

    // Mark as processed
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    console.log(`[Stripe Webhook] Successfully processed ${event.type}`);
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
      // Link discount code if used
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

  // Create order item
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

      // Generate access token for digital fulfillment
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);

      await db.accessToken.create({
        data: {
          tokenHash,
          orderId: order.id,
          productId,
          maxUses: DEFAULT_TOKEN_CONFIG.maxUses,
          expiresAt: new Date(
            Date.now() + DEFAULT_TOKEN_CONFIG.expiresInHours * 60 * 60 * 1000
          ),
        },
      });

      // Create enrollment for course products
      if (product.type === "COURSE" && userId) {
        await db.enrollment.upsert({
          where: {
            userId_productId: {
              userId,
              productId,
            },
          },
          update: { status: "ACTIVE" },
          create: {
            userId,
            productId,
            status: "ACTIVE",
          },
        });
      }

      // Update product stats
      await db.product.update({
        where: { id: productId },
        data: {
          orderItems: { connect: { id: (await db.orderItem.findFirst({ where: { orderId: order.id } }))?.id } },
        },
      });

      // Update workspace denormalized stats
      await db.workspace.update({
        where: { id: workspaceId },
        data: {
          orders: { connect: { id: order.id } },
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

  // Add buyer to email subscribers
  if (customerEmail) {
    await db.subscriber.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email: customerEmail.toLowerCase(),
        },
      },
      update: {
        status: "ACTIVE",
        unsubscribedAt: null,
      },
      create: {
        workspaceId,
        email: customerEmail.toLowerCase(),
        name: customerName,
        status: "ACTIVE",
        metadata: {
          source: "purchase",
          productId,
          orderId: order.id,
        },
      },
    });
  }

  // Create notification for creator
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: { where: { role: { in: ["OWNER", "ADMIN"] } } } },
  });

  if (workspace) {
    for (const member of workspace.members) {
      await db.notification.create({
        data: {
          userId: member.userId,
          type: "order_placed",
          title: "New Order!",
          message: `You received a new order for ${order.amount} ${currency}.`,
          data: {
            orderId: order.id,
            amount,
            currency,
            customerEmail,
          },
        },
      });
    }
  }

  // Log email send
  await db.emailLog.create({
    data: {
      orderId: order.id,
      to: customerEmail ?? "",
      subject: `Your purchase of ${(await db.product.findUnique({ where: { id: productId } }))?.name ?? "product"}`,
      template: "purchase_confirmation",
      status: "SENT",
    },
  });

  console.log(`[Stripe Webhook] Order created: ${order.id}`);
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
    console.log(`[Stripe Webhook] Order ${order.id} marked as failed (expired)`);
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

    // Revoke access tokens
    await db.accessToken.updateMany({
      where: { orderId: payment.orderId },
      data: { revokedAt: new Date() },
    });

    console.log(`[Stripe Webhook] Refund processed for order ${payment.orderId}`);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const { workspaceId, planId } = subscription.metadata ?? {};
  
  if (!workspaceId) {
    console.error("[Stripe Webhook] Missing workspaceId in subscription metadata");
    return;
  }

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
  // This handles SaaS subscription cancellations (not product purchases)
  const subscription = session.object === "subscription"
    ? session
    : await stripe.subscriptions.retrieve(session.id);

  await db.workspace.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
    },
  });

  console.log(`[Stripe Webhook] Subscription deleted`);
}
