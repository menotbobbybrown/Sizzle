import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/server/db";
import { SubscriptionStatus, SaaSPlan } from "@prisma/client";

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

  const session = event.data.object as any;

  if (event.type === "checkout.session.completed") {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const tenantId = session.metadata.tenantId;

    if (tenantId) {
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          // You might want to map price ID to SaaSPlan enum
          plan: SaaSPlan.BASIC, 
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    await db.tenant.update({
      where: { stripeSubscriptionId: session.id },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELED,
        plan: SaaSPlan.FREE,
      },
    });
  }

  return NextResponse.json({ received: true });
}
