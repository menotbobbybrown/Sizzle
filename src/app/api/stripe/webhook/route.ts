import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { sendInngestEvent, INNGEST_EVENTS } from "@/lib/inngest";
import { generateToken, hashToken, DEFAULT_TOKEN_CONFIG } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";

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
    console.error("Stripe webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Check idempotency - has this event been processed?
  const existingEvent = await db.webhookEvent.findUnique({
    where: { eventId_source: { eventId: event.id, source: "stripe" } },
  });

  if (existingEvent && existingEvent.status === "PROCESSED") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Record the event
  const webhookEvent = await db.webhookEvent.upsert({
    where: { eventId_source: { eventId: event.id, source: "stripe" } },
    update: {
      payload: event.data.object as object,
    },
    create: {
      eventId: event.id,
      source: "stripe",
      type: event.type,
      status: "PENDING",
      payload: event.data.object as object,
    },
  });

  try {
    const session = event.data.object as any;

    switch (event.type) {
      // ============================================================
      // CHECKOUT SESSION COMPLETED
      // ============================================================
      case "checkout.session.completed": {
        const { productId, workspaceId, userId, discountCode } = session.metadata;
        const customerEmail = session.customer_details?.email;
        const customerName = session.customer_details?.name;

        // Check if order already exists (idempotency on Stripe session)
        const existingOrder = await db.order.findUnique({
          where: { stripeSessionId: session.id },
        });

        if (existingOrder) {
          console.log(`Order already exists for session ${session.id}`);
          break;
        }

        // Resolve affiliate attribution
        const affiliateCode = session.metadata?.affiliateCode;
        let affiliateLinkId: string | null = null;

        if (affiliateCode) {
          const affiliateLink = await db.affiliateLink.findFirst({
            where: {
              workspaceId,
              code: affiliateCode,
              isActive: true,
            },
          });

          if (affiliateLink) {
            affiliateLinkId = affiliateLink.id;
          }
        }

        // Create order
        const order = await db.order.create({
          data: {
            workspaceId,
            userId: userId || null,
            isGuest: !userId,
            customerEmail,
            customerName,
            amount: session.amount_total / 100,
            currency: session.currency.toUpperCase(),
            status: "PAID",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            discountCodeId: discountCode ? (
              await db.discountCode.findUnique({ where: { code: discountCode } })
            )?.id : null,
            affiliateCode: affiliateCode || null,
            affiliateLinkId,
          },
        });

        // Increment affiliate conversion count if attribution resolved
        if (affiliateLinkId) {
          await db.affiliateLink.update({
            where: { id: affiliateLinkId },
            data: { conversionCount: { increment: 1 } },
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

        // Enqueue post-purchase work via Inngest
        await sendInngestEvent(INNGEST_EVENTS.ORDER_PAID, {
          orderId: order.id,
          workspaceId,
          userId,
          productId,
          amount: session.amount_total / 100,
        });

        break;
      }

      // ============================================================
      // SUBSCRIPTION EVENTS
      // ============================================================
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = session;
        
        // Find or create the subscription record
        const existingSubscription = await db.memberSubscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (existingSubscription) {
          // Update existing subscription
          await db.memberSubscription.update({
            where: { id: existingSubscription.id },
            data: {
              status: mapStripeSubscriptionStatus(subscription.status),
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
        } else {
          // This is a new subscription - find the user by customer ID
          // We'd need to look up the customer in Stripe or have stored the mapping
          console.log(`New subscription ${subscription.id} - user mapping needed`);
        }

        // Emit subscription created event
        if (event.type === "customer.subscription.created") {
          await sendInngestEvent(INNGEST_EVENTS.SUBSCRIPTION_CREATED, {
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = session;

        const dbSubscription = await db.memberSubscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (dbSubscription) {
          await db.memberSubscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: "CANCELED",
            },
          });

          await sendInngestEvent(INNGEST_EVENTS.SUBSCRIPTION_CANCELED, {
            subscriptionId: dbSubscription.id,
            userId: dbSubscription.userId,
          });
        }

        break;
      }

      // ============================================================
      // INVOICE EVENTS
      // ============================================================
      case "invoice.payment_failed": {
        const invoice = session;

        const dbSubscription = await db.memberSubscription.findUnique({
          where: { stripeSubscriptionId: invoice.subscription },
        });

        if (dbSubscription) {
          await db.memberSubscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: "PAST_DUE",
            },
          });

          await sendInngestEvent(INNGEST_EVENTS.INVOICE_PAYMENT_FAILED, {
            subscriptionId: dbSubscription.id,
            userId: dbSubscription.userId,
            invoiceId: invoice.id,
          });
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = session;

        // If this is a subscription renewal, update the subscription
        if (invoice.subscription) {
          const dbSubscription = await db.memberSubscription.findUnique({
            where: { stripeSubscriptionId: invoice.subscription },
          });

          if (dbSubscription) {
            await db.memberSubscription.update({
              where: { id: dbSubscription.id },
              data: {
                status: "ACTIVE",
                currentPeriodStart: new Date(invoice.period_start * 1000),
                currentPeriodEnd: new Date(invoice.period_end * 1000),
              },
            });

            await sendInngestEvent(INNGEST_EVENTS.SUBSCRIPTION_RENEWED, {
              subscriptionId: dbSubscription.id,
              userId: dbSubscription.userId,
            });
          }
        }

        break;
      }

      // ============================================================
      // CHARGE REFUNDS
      // ============================================================
      case "charge.refunded": {
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

        break;
      }

      // ============================================================
      // CHECKOUT SESSION EXPIRED
      // ============================================================
      case "checkout.session.expired": {
        const order = await db.order.findUnique({
          where: { stripeSessionId: session.id },
        });
        if (order && order.status === "PENDING") {
          await db.order.update({
            where: { id: order.id },
            data: { status: "FAILED" },
          });
        }

        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
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
      data: { 
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return new NextResponse("Internal error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Map Stripe subscription status to our enum
 */
function mapStripeSubscriptionStatus(status: string) {
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
}/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
