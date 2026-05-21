import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
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
          userId: session.metadata.userId || null,
          isGuest: !session.metadata.userId,
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
          if (product.type === "COURSE" && session.metadata.userId) {
            await db.enrollment.upsert({
              where: {
                userId_productId: {
                  userId: session.metadata.userId,
                  productId,
                },
              },
              update: { status: "ACTIVE" },
              create: {
                userId: session.metadata.userId,
                productId,
                status: "ACTIVE",
              },
            });
          }

          // Send post-purchase receipt email
          const accessUrl = `${env.APP_URL}/api/access/${rawToken}`;
          const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });

          await sendEmail({
            to: customerEmail ?? session.customer_details?.email ?? "",
            subject: `Your purchase of ${product.name}`,
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <tr>
      <td style="text-align: center; padding: 24px 0;">
        <h1 style="font-size: 24px; margin: 0;">Thank you for your purchase!</h1>
        <p style="color: #71717a; margin-top: 8px;">Your order has been confirmed.</p>
      </td>
    </tr>
    <tr>
      <td style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 18px; margin: 0 0 16px;">${product.name}</h2>
        <p style="color: #71717a;">Amount paid: ${order.amount}</p>
        <a href="${accessUrl}" style="display: inline-block; margin-top: 16px; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Access your purchase
        </a>
      </td>
    </tr>
    <tr>
      <td style="text-align: center; padding-top: 24px; color: #71717a; font-size: 12px;">
        <p>Powered by Sizzle${workspace ? ` &mdash; ${workspace.name}` : ""}</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
            tags: [
              { name: "orderId", value: order.id },
              { name: "type", value: "receipt" },
            ],
          });

          // Log email send
          await db.emailLog.create({
            data: {
              orderId: order.id,
              to: customerEmail ?? "",
              subject: `Your purchase of ${product.name}`,
              template: "receipt",
              status: "SENT",
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