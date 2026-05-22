import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";

/**
 * Optimized Stripe Webhook Handler
 * 
 * Flow:
 * 1. Verify signature
 * 2. Idempotency check against database
 * 3. Persist event record (PENDING)
 * 4. Enqueue Inngest background job
 * 5. Return 200 OK immediately
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  if (!signature) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Idempotency check - have we already processed this event?
  const existingEvent = await db.webhookEvent.findUnique({
    where: { eventId: event.id },
  });

  if (existingEvent?.status === "PROCESSED") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Record the event and enqueue background job
  try {
    await db.webhookEvent.upsert({
      where: { eventId: event.id },
      update: {},
      create: {
        eventId: event.id,
        source: "stripe",
        type: event.type,
        status: "PENDING",
        payload: event as any,
      },
    });

    // Enqueue Inngest event
    await inngest.send({
      name: "stripe/event",
      data: {
        type: event.type,
        event: event,
      },
    });

    return NextResponse.json({ received: true, fastPath: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error enqueuing event:`, error);
    return new NextResponse("Webhook record failed", { status: 500 });
  }
}
