import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Check idempotency - has this event been processed?
  const existingEvent = await db.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });

  if (existingEvent && existingEvent.status === "PROCESSED") {
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

    if (event.type === "checkout.session.completed") {
      const { productId, workspaceId } = session.metadata;
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name;

      // Create order
      const order = await db.order.create({
        data: {
          workspaceId,
          userId: session.metadata.userId ?? "anonymous",
          customerEmail,
          customerName,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          status: "PAID",
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
        },
      });

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
        }
      }

      // Create payment record
      await db.payment.create({
        data: {
          orderId: order.id,
          stripePaymentIntentId: session.payment_intent,
          stripeSessionId: session.id,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          status: "SUCCEEDED",
        },
      });

      // TODO: Send post-purchase email
      // TODO: Create access token for digital fulfillment
      // TODO: Create enrollment for course products
    }

    if (event.type === "checkout.session.expired") {
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

    if (event.type === "charge.refunded") {
      const paymentIntentId = session.payment_intent;
      if (paymentIntentId) {
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
        }
      }
    }

    // Mark event as processed
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "FAILED" },
    });
  }

  return NextResponse.json({ received: true });
}