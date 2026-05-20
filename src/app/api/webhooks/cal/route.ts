import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import crypto from "crypto";

/**
 * Cal.com Webhook Handler
 * 
 * Handles Cal.com booking events:
 * - BOOKING_CREATED (new booking)
 * - BOOKING_CANCELLED (booking cancelled)
 * - BOOKING_RESCHEDULED (booking rescheduled)
 * - BOOKING_COMPLETED (booking marked as completed)
 * - MEETING_ENDED (meeting has ended)
 */
export async function POST(req: NextRequest) {
  // Verify webhook signature if API key is configured
  const calApiKey = req.headers.get("x-cal-api-key");
  
  if (!calApiKey) {
    return new NextResponse("Missing Cal.com API key", { status: 401 });
  }

  // TODO: Verify Cal.com webhook signature
  // Cal.com webhooks can be verified using the API key or signature header
  // const expectedKey = env.CALCOM_API_KEY;
  // if (calApiKey !== expectedKey) {
  //   return new NextResponse("Invalid API key", { status: 401 });
  // }

  const body = await req.json();
  const { event, payload } = body;

  console.log(`[Cal Webhook] Received: ${event}`);

  try {
    switch (event) {
      case "BOOKING_CREATED": {
        const { uid, startTime, endTime, title, attendees, user } = payload;
        
        // TODO: Create booking/order record
        // const booking = await db.booking.create({
        //   data: {
        //     calEventId: uid,
        //     productId: findProductByTitle(title),
        //     customerEmail: attendees?.[0]?.email,
        //     customerName: attendees?.[0]?.name,
        //     startTime: new Date(startTime),
        //     endTime: new Date(endTime),
        //     status: "CONFIRMED",
        //   },
        // });
        
        // TODO: Send confirmation email
        // await sendEmail({
        //   to: attendees?.[0]?.email,
        //   template: "booking_confirmation",
        //   data: { ... },
        // });
        
        console.log(`[Cal Webhook] Booking created: ${uid}`);
        break;
      }

      case "BOOKING_CANCELLED": {
        const { uid } = payload;
        
        // TODO: Update booking status to cancelled
        // await db.booking.update({
        //   where: { calEventId: uid },
        //   data: { status: "CANCELLED" },
        // });
        
        // TODO: Process refund if applicable
        // await stripe.refunds.create({ ... });
        
        console.log(`[Cal Webhook] Booking cancelled: ${uid}`);
        break;
      }

      case "BOOKING_RESCHEDULED": {
        const { uid, startTime, endTime } = payload;
        
        // TODO: Update booking with new times
        // await db.booking.update({
        //   where: { calEventId: uid },
        //   data: {
        //     startTime: new Date(startTime),
        //     endTime: new Date(endTime),
        //   },
        // });
        
        // TODO: Send rescheduling notification email
        console.log(`[Cal Webhook] Booking rescheduled: ${uid}`);
        break;
      }

      case "BOOKING_COMPLETED": {
        const { uid } = payload;
        
        // TODO: Mark booking as completed
        // await db.booking.update({
        //   where: { calEventId: uid },
        //   data: { status: "COMPLETED" },
        // });
        
        // TODO: Trigger review request email
        console.log(`[Cal Webhook] Booking completed: ${uid}`);
        break;
      }

      case "MEETING_ENDED": {
        const { uid, duration } = payload;
        
        // TODO: Track meeting duration for analytics
        // await db.booking.update({
        //   where: { calEventId: uid },
        //   data: { actualDuration: duration },
        // });
        
        console.log(`[Cal Webhook] Meeting ended: ${uid}, duration: ${duration}`);
        break;
      }

      default:
        console.log(`[Cal Webhook] Unhandled event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Cal Webhook] Error processing event:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}