import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("X-Cal-Signature-256");
  
  if (env.CALCOM_WEBHOOK_SECRET && signature) {
    const hmac = crypto.createHmac("sha256", env.CALCOM_WEBHOOK_SECRET);
    const digest = hmac.update(rawBody).digest("hex");
    if (signature !== digest) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);
  const { triggerEvent, payload } = body;

  console.log(`[Cal Webhook] Received: ${triggerEvent}`);

  try {
    switch (triggerEvent) {
      case "BOOKING_CREATED": {
        const { uid, startTime, endTime, title, attendees, metadata, eventTypeId } = payload;
        
        // Find product by eventTypeId if possible, or title
        const coachingConfig = await db.coachingConfig.findFirst({
          where: { eventTypeId: eventTypeId },
          include: { product: true },
        });

        if (coachingConfig) {
          // Create an order or link to existing if we have metadata
          // For now, just trigger Inngest
          await inngest.send({
            name: "cal/booking.created",
            data: {
              bookingId: uid,
              productId: coachingConfig.productId,
              customerEmail: attendees?.[0]?.email,
              startTime,
              endTime,
            },
          });
        }
        
        console.log(`[Cal Webhook] Booking created: ${uid}`);
        break;
      }

      case "BOOKING_CANCELLED": {
        const { uid } = payload;
        
        await inngest.send({
          name: "cal/booking.cancelled",
          data: {
            bookingId: uid,
          },
        });
        
        console.log(`[Cal Webhook] Booking cancelled: ${uid}`);
        break;
      }

      default:
        console.log(`[Cal Webhook] Unhandled event: ${triggerEvent}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Cal Webhook] Error processing event:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
