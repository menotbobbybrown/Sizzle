import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { sendInngestEvent, INNGEST_EVENTS } from "@/lib/inngest";
import crypto from "crypto";

/**
 * Verify Cal.com webhook signature using the x-cal-signature-256 header
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

  try {
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers may be different lengths
    return false;
  }
}

/**
 * Build a unique eventId for idempotency
 */
function buildEventId(triggerEvent: string, uid: string): string {
  return `${triggerEvent}_${uid}`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-cal-signature-256");

  // Verify webhook signature when secret is configured
  if (env.CALCOM_WEBHOOK_SECRET) {
    if (!signature) {
      console.log("[Cal Webhook] Missing x-cal-signature-256 header");
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

  const { event: triggerEvent, payload: eventPayload } = payload;

  console.log(`[Cal Webhook] Received: ${triggerEvent}`);

  try {
    switch (triggerEvent) {
      // ============================================================
      // BOOKING CREATED
      // ============================================================
      case "BOOKING_CREATED": {
        const { uid, startTime, endTime, title, attendees, user } = eventPayload;

        // Build idempotency key
        const eventId = buildEventId(triggerEvent, uid);

        // Check idempotency
        const existingEvent = await db.webhookEvent.findUnique({
          where: { eventId },
        });

        if (existingEvent && existingEvent.status === "PROCESSED") {
          console.log(`[Cal Webhook] Event ${eventId} already processed`);
          return NextResponse.json({ received: true, idempotent: true });
        }

        // Record webhook event as pending
        const webhookEvent = await db.webhookEvent.upsert({
          where: { eventId },
          update: {
            payload: eventPayload,
          },
          create: {
            eventId,
            source: "calcom",
            type: triggerEvent,
            status: "PENDING",
            payload: eventPayload,
          },
        });

        // Parse metadata to find the product/workspace
        const metadata = eventPayload.metadata || {};
        const productId = metadata.productId || metadata.product_id;
        const workspaceId = metadata.workspaceId || metadata.workspace_id;
        const userId = metadata.userId || metadata.user_id;

        // If we don't have workspaceId in metadata, try to resolve from organizer username
        let resolvedWorkspaceId = workspaceId;
        if (!resolvedWorkspaceId && user?.username) {
          const orgWorkspace = await db.workspace.findFirst({
            where: { handle: user.username.toLowerCase() },
          });
          if (orgWorkspace) {
            resolvedWorkspaceId = orgWorkspace.id;
          }
        }

        // Find or create the booking
        const existingBooking = await db.booking.findUnique({
          where: { calEventId: uid },
        });

        if (existingBooking) {
          console.log(`[Cal Webhook] Booking ${uid} already exists`);
          // Still mark event as processed
          await db.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
          return NextResponse.json({ received: true, bookingId: existingBooking.id });
        }

        // Resolve product from workspace's coaching config if not in metadata
        let resolvedProductId = productId;
        if (!resolvedProductId && resolvedWorkspaceId && eventPayload.eventTypeId) {
          const coachingConfig = await db.coachingConfig.findFirst({
            where: {
              product: { workspaceId: resolvedWorkspaceId },
              calEventTypeId: String(eventPayload.eventTypeId),
            },
          });
          if (coachingConfig) {
            resolvedProductId = coachingConfig.productId;
          }
        }

        const customerEmail = attendees?.[0]?.email || "";
        const customerName = attendees?.[0]?.name || null;
        const customerTimezone = attendees?.[0]?.timezone || null;

        // Create booking record
        const booking = await db.booking.create({
          data: {
            productId: resolvedProductId || "unknown",
            userId: userId || null,
            calEventId: uid,
            calEventTypeId: eventPayload.eventTypeId || eventPayload.event_type_id,
            customerEmail,
            customerName,
            customerTimezone,
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

        // Mark webhook event as processed
        await db.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: "PROCESSED", processedAt: new Date() },
        });

        // Fire Inngest booking created event
        if (resolvedWorkspaceId) {
          await sendInngestEvent(INNGEST_EVENTS.BOOKING_CREATED, {
            bookingId: booking.id,
            workspaceId: resolvedWorkspaceId,
            customerEmail,
            customerName,
            productId: resolvedProductId,
          });
        }

        console.log(`[Cal Webhook] Booking created: ${uid}`);
        return NextResponse.json({ received: true, bookingId: booking.id });
      }

      // ============================================================
      // BOOKING CANCELLED
      // ============================================================
      case "BOOKING_CANCELLED": {
        const { uid, cancellationReason } = eventPayload;

        const eventId = buildEventId(triggerEvent, uid);

        // Check idempotency
        const existingEvent = await db.webhookEvent.findUnique({
          where: { eventId },
        });

        if (existingEvent && existingEvent.status === "PROCESSED") {
          console.log(`[Cal Webhook] Event ${eventId} already processed`);
          return NextResponse.json({ received: true, idempotent: true });
        }

        // Record webhook event as pending
        const webhookEvent = await db.webhookEvent.upsert({
          where: { eventId },
          update: {
            payload: eventPayload,
          },
          create: {
            eventId,
            source: "calcom",
            type: triggerEvent,
            status: "PENDING",
            payload: eventPayload,
          },
        });

        // Find the booking
        const booking = await db.booking.findUnique({
          where: { calEventId: uid },
        });

        if (!booking) {
          console.log(`[Cal Webhook] Booking ${uid} not found for cancellation`);

          // Mark event as failed since we couldn't find the booking
          await db.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              status: "FAILED",
              error: "Booking not found",
              processedAt: new Date(),
            },
          });

          return NextResponse.json(
            { received: true, error: "Booking not found" },
            { status: 200 } // Return 200 so Cal doesn't retry
          );
        }

        // Update booking status
        await db.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: cancellationReason || null,
          },
        });

        // Mark webhook event as processed
        await db.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: "PROCESSED", processedAt: new Date() },
        });

        // Resolve workspace from the booking's product
        const bookingWithProduct = await db.booking.findUnique({
          where: { id: booking.id },
          include: { order: { select: { workspaceId: true } } },
        });

        let cancelledWorkspaceId: string | undefined;

        // Try to resolve workspace through the product
        if (booking.productId && booking.productId !== "unknown") {
          const prod = await db.product.findUnique({
            where: { id: booking.productId },
            select: { workspaceId: true },
          });
          if (prod) {
            cancelledWorkspaceId = prod.workspaceId;
          }
        }

        // Fallback: resolve via order
        if (!cancelledWorkspaceId && bookingWithProduct?.order?.workspaceId) {
          cancelledWorkspaceId = bookingWithProduct.order.workspaceId;
        }

        // Fire Inngest booking cancelled event
        await sendInngestEvent(INNGEST_EVENTS.BOOKING_CANCELLED, {
          bookingId: booking.id,
          workspaceId: cancelledWorkspaceId || "unknown",
          reason: cancellationReason || null,
        });

        console.log(`[Cal Webhook] Booking cancelled: ${uid}`);
        return NextResponse.json({ received: true, bookingId: booking.id });
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

        return NextResponse.json({ received: true });
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
                ...(typeof booking.metadata === "object" && booking.metadata !== null
                  ? (booking.metadata as object)
                  : {}),
                actualDuration: duration,
              },
            },
          });

          await sendInngestEvent(INNGEST_EVENTS.BOOKING_COMPLETED, {
            bookingId: booking.id,
          });

          console.log(`[Cal Webhook] Booking completed: ${uid}, duration: ${duration}`);
        }

        return NextResponse.json({ received: true });
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

        return NextResponse.json({ received: true });
      }

      default:
        console.log(`[Cal Webhook] Unhandled event: ${triggerEvent}`);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error("[Cal Webhook] Error processing event:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
