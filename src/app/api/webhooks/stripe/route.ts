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

  const session = event.data.object as any;

  if (event.type === "checkout.session.completed") {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const workspaceId = session.metadata.workspaceId;

    if (workspaceId) {
      await db.workspace.update({
        where: { id: workspaceId },
        data: {
          stripeSubscriptionId: subscription.id,
          plan: "ACTIVE",
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    await db.workspace.update({
      where: { stripeSubscriptionId: session.id },
      data: {
        plan: "TRIALING",
        stripeSubscriptionId: null,
      },
    });
  }

  return NextResponse.json({ received: true });
}