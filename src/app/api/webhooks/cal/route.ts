import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { sendInngestEvent, INNGEST_EVENTS } from "@/lib/inngest";
import crypto from "crypto";

/**
 * Verify Cal.com webhook signature
 */
function verifyCalSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-cal-signature");
  
  // Verify webhook signature
  if (env.CALCOM_WEBHOOK_SECRET) {
    if (!signature) {
      console.log("[Cal Webhook] Missing signature");
      return new NextResponse("Missing signature", { status: 401 });
    }

    if (!verifyCalSignature(body, signature, env.CALCOM_WEBHOOK_SECRET)) {
      console.log("[Cal Webhook] Invalid signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { event, payload: eventPayload } = payload;

  console.log(`[Cal Webhook] Received: ${event}`);

  try {
    switch (event) {
      // ============================================================
      // BOOKING CREATED
      // ============================================================
      case "BOOKING_CREATED": {
        const { uid, startTime, endTime, title, attendees, user } = eventPayload;
        
        // Parse metadata to find the product/workspace
        const metadata = eventPayload.metadata || {};
        const productId = metadata.productId || metadata.product_id;
        const workspaceId = metadata.workspaceId || metadata.workspace_id;
        const userId = metadata.userId || metadata.user_id;
        
        // Find or create the booking
        const existingBooking = await db.booking.findUnique({
          where: { calEventId: uid },
        });
        
        if (existingBooking) {
          console.log(`[Cal Webhook] Booking ${uid} already exists`);
          break;
        }
        
        // Create booking record
        const booking = await db.booking.create({
          data: {
            productId: productId || "unknown",
            userId: userId || null,
            calEventId: uid,
            calEventTypeId: eventPayload.eventTypeId || eventPayload.event_type_id,
            customerEmail: attendees?.[0]?.email || "",
            customerName: attendees?.[0]?.name || null,
            customerTimezone: attendees?.[0]?.timezone || null,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            status: "CONFIRMED",
            metadata: {
              title,
              host: user?.name || user?.email,
              originalPayload: eventPayload,
            },
          },
        });
        
        // Enqueue booking created flow
        if (workspaceId) {
          await sendInngestEvent(INNGEST_EVENTS.BOOKING_CREATED, {
            bookingId: booking.id,
            workspaceId,
            customerEmail: attendees?.[0]?.email,
          });
        }
        
        console.log(`[Cal Webhook] Booking created: ${uid}`);
        break;
      }

      // ============================================================
      // BOOKING CANCELLED
      // ============================================================
      case "BOOKING_CANCELLED": {
        const { uid, cancellationReason } = eventPayload;
        
        // Find the booking
        const booking = await db.booking.findUnique({
          where: { calEventId: uid },
        });
        
        if (!booking) {
          console.log(`[Cal Webhook] Booking ${uid} not found for cancellation`);
          break;
        }
        
        // Update booking status
        await db.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: cancellationReason,
          },
        });
        
        // Enqueue booking cancelled flow
        await sendInngestEvent(INNGEST_EVENTS.BOOKING_CANCELLED, {
          bookingId: booking.id,
          workspaceId: booking.productId, // We'll need to look up workspace properly
          reason: cancellationReason,
        });
        
        console.log(`[Cal Webhook] Booking cancelled: ${uid}`);
        break;
      }

      // ============================================================
      // BOOKING RESCHEDULED
      // ============================================================
      case "BOOKING_RESCHEDULED": {
        const { uid, startTime, endTime } = eventPayload;
        
        const booking = await db.booking.findUnique({
          where: { calEventId: uid },
        });
        
        if (booking) {
          await db.booking.update({
            where: { id: booking.id },
            data: {
              startTime: new Date(startTime),
              endTime: new Date(endTime),
            },
          });
          
          console.log(`[Cal Webhook] Booking rescheduled: ${uid}`);
        }
        
        break;
      }

      // ============================================================
      // BOOKING COMPLETED
      // ============================================================
      case "BOOKING_COMPLETED":
      case "MEETING_ENDED": {
        const { uid, duration } = eventPayload;
        
        const booking = await db.booking.findUnique({
          where: { calEventId: uid },
        });
        
        if (booking) {
          await db.booking.update({
            where: { id: booking.id },
            data: {
              status: "COMPLETED",
              metadata: {
                ...(booking.metadata as object || {}),
                actualDuration: duration,
              },
            },
          });
          
          await sendInngestEvent(INNGEST_EVENTS.BOOKING_COMPLETED, {
            bookingId: booking.id,
          });
          
          console.log(`[Cal Webhook] Booking completed: ${uid}, duration: ${duration}`);
        }
        
        break;
      }

      // ============================================================
      // BOOKING NO SHOW
      // ============================================================
      case "BOOKING_NO_SHOW": {
        const { uid } = eventPayload;
        
        const booking = await db.booking.findUnique({
          where: { calEventId: uid },
        });
        
        if (booking) {
          await db.booking.update({
            where: { id: booking.id },
            data: { status: "NO_SHOW" },
          });
          
          console.log(`[Cal Webhook] Booking no-show: ${uid}`);
        }
        
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