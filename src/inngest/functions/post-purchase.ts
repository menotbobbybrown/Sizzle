import { inngest, INNGEST_EVENTS } from "@/lib/inngest";
import { db } from "@/lib/db";
import { revalidateTag } from "@/lib/revalidate";
import { cache } from "@/lib/cache";
import { sendEmail } from "@/lib/email";
import { getPusher, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";
import { env } from "@/env";
import { generateToken, hashToken, DEFAULT_TOKEN_CONFIG } from "@/lib/tokens";
import { stripeWebhookHandler } from "./stripe-webhooks";

// ============================================================
// POST-PURCHASE FLOW
// ============================================================

export const postPurchaseFlow = inngest.createFunction(
  { id: "post-purchase-flow", name: "Post-Purchase Flow", triggers: [{ event: INNGEST_EVENTS.ORDER_PAID }] },
  async ({ event, step }) => {
    const { orderId, workspaceId, userId, productId } = event.data;

    // Step 1: Create fulfillment (access token, enrollment).
    //
    // The raw access token is generated here and returned from the step so the
    // email step can build a working access link. We only ever persist the
    // token's SHA-256 hash; the raw value lives solely in this function's step
    // memo (short-lived) and in the receipt email. `step.run` memoizes its
    // result on success, so a retry never mints a second token.
    const fulfillment = await step.run("Create Fulfillment", async () => {
      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Generate access token for digital fulfillment
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);

      await db.accessToken.create({
        data: {
          tokenHash,
          orderId,
          productId,
          maxUses: DEFAULT_TOKEN_CONFIG.maxUses,
          expiresAt: new Date(
            Date.now() + DEFAULT_TOKEN_CONFIG.expiresInHours * 60 * 60 * 1000
          ),
        },
      });

      // Create enrollment for course products
      // Only for authenticated users - guests access via AccessToken-based path
      if (product.type === "COURSE" && userId) {
        await db.enrollment.upsert({
          where: {
            userId_productId: {
              userId,
              productId,
            },
          },
          update: { status: "ACTIVE" },
          create: {
            userId,
            productId,
            status: "ACTIVE",
          },
        });
      }
      // For guest course purchases, access is provided via AccessToken link
      // No user enrollment is created, but the token grants access to course content

      return {
        rawToken,
        enrollmentCreated: product.type === "COURSE" && !!userId,
      };
    });
    
    // Step 2: Send purchase email (retryable)
    await step.run("Send Purchase Email", async () => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { 
          items: { include: { product: true } },
          workspace: true,
        },
      });
      
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      const accessUrl = `${env.NEXT_PUBLIC_APP_URL}/api/access/${fulfillment.rawToken}`;
      const productNames = order.items.map(item => item.product.name).join(", ");
      
      await sendEmail({
        to: order.customerEmail ?? "",
        subject: `Your purchase of ${productNames}`,
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
        <h2 style="font-size: 18px; margin: 0 0 16px;">${productNames}</h2>
        <p style="color: #71717a;">Amount paid: $${order.amount}</p>
        <a href="${accessUrl}" style="display: inline-block; margin-top: 16px; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Access your purchase
        </a>
      </td>
    </tr>
    <tr>
      <td style="text-align: center; padding-top: 24px; color: #71717a; font-size: 12px;">
        <p>Powered by Sizzle${order.workspace ? ` — ${order.workspace.name}` : ""}</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
        tags: [
          { name: "orderId", value: orderId },
          { name: "type", value: "receipt" },
        ],
      });
      
      await db.emailLog.create({
        data: {
          orderId,
          to: order.customerEmail ?? "",
          subject: `Your purchase of ${productNames}`,
          template: "receipt",
          status: "SENT",
        },
      });
    });
    
    // Step 3: Update analytics (async, best effort)
    await step.run("Update Analytics", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await db.analyticsDaily.upsert({
        where: {
          workspaceId_date: {
            workspaceId,
            date: today,
          },
        },
        update: {
          orderCount: { increment: 1 },
          gmv: { increment: event.data.amount || 0 },
        },
        create: {
          workspaceId,
          date: today,
          orderCount: 1,
          gmv: event.data.amount || 0,
        },
      });
    });
    
    // Step 4: Upsert subscriber
    await step.run("Upsert Subscriber", async () => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { workspace: true },
      });
      
      if (order?.customerEmail) {
        await db.subscriber.upsert({
          where: {
            workspaceId_email: {
              workspaceId,
              email: order.customerEmail,
            },
          },
          update: {
            name: order.customerName,
          },
          create: {
            workspaceId,
            email: order.customerEmail,
            name: order.customerName,
            status: "ACTIVE",
          },
        });
      }
    });
    
    // Step 5: Create recent sale for social proof
    await step.run("Create Recent Sale", async () => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });
      
      if (order) {
        // Anonymize the buyer name - just use first name
        const buyerName = order.customerName?.split(" ")[0] + "." || "Anonymous";
        const productName = order.items[0]?.product.name || "Product";
        
        await db.recentSale.create({
          data: {
            workspaceId,
            buyerName,
            productName,
            amount: order.amount,
            currency: order.currency,
          },
        });
      }
    });
    
    // Step 6: Emit realtime notification to creator
    await step.run("Emit Realtime Notification", async () => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });
      
      if (!order) return;
      
      // Get workspace owners/admins
      const members = await db.workspaceMember.findMany({
        where: {
          workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { user: true },
      });
      
      // Create notifications for each member
      for (const member of members) {
        await db.notification.create({
          data: {
            userId: member.userId,
            type: "order_placed",
            title: "New Sale!",
            message: `You made a new sale: ${order.items[0]?.product.name} - $${order.amount}`,
            data: {
              orderId,
              amount: Number(order.amount),
              productName: order.items[0]?.product.name,
            },
          },
        });
      }
      
      // Emit Pusher event for real-time dashboard updates
      const pusher = getPusher();
      await pusher.trigger(PUSHER_CHANNELS.WORKSPACE(workspaceId), PUSHER_EVENTS.NEW_ORDER, {
        orderId,
        amount: Number(order.amount),
        productName: order.items[0]?.product.name,
        timestamp: new Date().toISOString(),
      });
    });

    // Step 7: Revalidate storefront
    await step.run("Revalidate Storefront", async () => {
      const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { handle: true },
      });
      if (workspace?.handle) {
        revalidateTag(`storefront-${workspace.handle}`);
        await cache.invalidateStorefront(workspace.handle);
      }
    });
    
    return { success: true, orderId };
  }
);

// ============================================================
// BOOKING CREATED FLOW
// ============================================================

export const bookingCreatedFlow = inngest.createFunction(
  { id: "booking-created-flow", name: "Booking Created Flow", triggers: [{ event: INNGEST_EVENTS.BOOKING_CREATED }] },
  async ({ event, step }) => {
    const { bookingId, workspaceId } = event.data;
    
    // Step 1: Send booking confirmation email
    await step.run("Send Confirmation Email", async () => {
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: {
          order: { include: { workspace: true } },
        },
      });
      
      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }
      
      await sendEmail({
        to: booking.customerEmail,
        subject: `Booking Confirmed: ${booking.startTime.toLocaleDateString()}`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
  <h1>Your booking is confirmed!</h1>
  <p>Date: ${booking.startTime.toLocaleString()}</p>
  <p>Timezone: ${booking.customerTimezone || "UTC"}</p>
</body>
</html>`,
        tags: [
          { name: "bookingId", value: bookingId },
          { name: "type", value: "booking_confirmation" },
        ],
      });
    });
    
    // Step 2: Notify creator
    await step.run("Notify Creator", async () => {
      const members = await db.workspaceMember.findMany({
        where: {
          workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { user: true },
      });
      
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
      });
      
      for (const member of members) {
        await db.notification.create({
          data: {
            userId: member.userId,
            type: "booking_created",
            title: "New Booking!",
            message: `You have a new booking from ${booking?.customerName || booking?.customerEmail}`,
            data: { bookingId },
          },
        });
      }
    });
    
    return { success: true, bookingId };
  }
);

// ============================================================
// BOOKING CANCELLED FLOW
// ============================================================

export const bookingCancelledFlow = inngest.createFunction(
  { id: "booking-cancelled-flow", name: "Booking Cancelled Flow", triggers: [{ event: INNGEST_EVENTS.BOOKING_CANCELLED }] },
  async ({ event, step }) => {
    const { bookingId, workspaceId, reason } = event.data;
    
    // Step 1: Send cancellation email to customer
    await step.run("Send Cancellation Email", async () => {
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
      });
      
      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }
      
      await sendEmail({
        to: booking.customerEmail,
        subject: "Booking Cancelled",
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
  <h1>Your booking has been cancelled</h1>
  ${reason ? `<p>Reason: ${reason}</p>` : ""}
</body>
</html>`,
        tags: [
          { name: "bookingId", value: bookingId },
          { name: "type", value: "booking_cancelled" },
        ],
      });
    });
    
    // Step 2: Notify creator
    await step.run("Notify Creator", async () => {
      const members = await db.workspaceMember.findMany({
        where: {
          workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { user: true },
      });
      
      for (const member of members) {
        await db.notification.create({
          data: {
            userId: member.userId,
            type: "booking_cancelled",
            title: "Booking Cancelled",
            message: `A booking has been cancelled${reason ? `: ${reason}` : ""}`,
            data: { bookingId },
          },
        });
      }
    });
    
    return { success: true, bookingId };
  }
);

// ============================================================
// SUBSCRIPTION CREATED FLOW
// ============================================================

export const subscriptionCreatedFlow = inngest.createFunction(
  { id: "subscription-created-flow", name: "Subscription Created Flow", triggers: [{ event: INNGEST_EVENTS.SUBSCRIPTION_CREATED }] },
  async ({ event, step }) => {
    const { subscriptionId, userId, workspaceId } = event.data;
    
    // Step 1: Send welcome email
    await step.run("Send Welcome Email", async () => {
      const subscription = await db.memberSubscription.findUnique({
        where: { id: subscriptionId },
        include: { product: { include: { workspace: true } } },
      });
      
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }
      
      const user = await db.user.findUnique({ where: { id: userId } });
      
      await sendEmail({
        to: user?.email ?? "",
        subject: `Welcome to ${subscription.product.workspace.name}!`,
        html: `<!DOCTYPE html>
<html>
<body>
  <h1>Welcome to your new membership!</h1>
  <p>You're now a member of ${subscription.product.workspace.name}.</p>
</body>
</html>`,
        tags: [
          { name: "subscriptionId", value: subscriptionId },
          { name: "type", value: "subscription_welcome" },
        ],
      });
    });
    
    return { success: true, subscriptionId };
  }
);

// ============================================================
// SUBSCRIPTION CANCELLED FLOW
// ============================================================

export const subscriptionCancelledFlow = inngest.createFunction(
  { id: "subscription-cancelled-flow", name: "Subscription Cancelled Flow", triggers: [{ event: INNGEST_EVENTS.SUBSCRIPTION_CANCELED }] },
  async ({ event, step }) => {
    const { subscriptionId, userId } = event.data;
    
    // Step 1: Send cancellation confirmation
    await step.run("Send Cancellation Email", async () => {
      const subscription = await db.memberSubscription.findUnique({
        where: { id: subscriptionId },
        include: { product: true },
      });
      
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }
      
      const user = await db.user.findUnique({ where: { id: userId } });
      
      await sendEmail({
        to: user?.email ?? "",
        subject: "Subscription Cancelled",
        html: `<!DOCTYPE html>
<html>
<body>
  <h1>Subscription Cancelled</h1>
  <p>Your membership has been cancelled. You can resubscribe anytime.</p>
</body>
</html>`,
        tags: [
          { name: "subscriptionId", value: subscriptionId },
          { name: "type", value: "subscription_cancelled" },
        ],
      });
    });
    
    return { success: true, subscriptionId };
  }
);

// ============================================================
// COURSE COMPLETED FLOW (Certificate Generation)
// ============================================================

export const courseCompletedFlow = inngest.createFunction(
  { id: "course-completed-flow", name: "Course Completed Flow", triggers: [{ event: INNGEST_EVENTS.COURSE_COMPLETED }] },
  async ({ event, step }) => {
    const { enrollmentId, userId, productId } = event.data;
    
    // Step 1: Update enrollment status
    await step.run("Update Enrollment", async () => {
      await db.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    });
    
    // Step 2: Send completion email
    await step.run("Send Completion Email", async () => {
      const enrollment = await db.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          user: true,
          product: { include: { workspace: true } },
        },
      });
      
      if (!enrollment) {
        throw new Error(`Enrollment ${enrollmentId} not found`);
      }
      
      await sendEmail({
        to: enrollment.user.email ?? "",
        subject: `Congratulations! You've completed ${enrollment.product.name}`,
        html: `<!DOCTYPE html>
<html>
<body>
  <h1>Congratulations!</h1>
  <p>You've completed ${enrollment.product.name}!</p>
  <p>Your certificate is being generated and will be available in your dashboard.</p>
</body>
</html>`,
        tags: [
          { name: "enrollmentId", value: enrollmentId },
          { name: "type", value: "course_completed" },
        ],
      });
    });
    
    return { success: true, enrollmentId };
  }
);

// ============================================================
// INNGEST FUNCTION REGISTRY
// ============================================================

export const inngestFunctions = [
  postPurchaseFlow,
  bookingCreatedFlow,
  bookingCancelledFlow,
  subscriptionCreatedFlow,
  subscriptionCancelledFlow,
  courseCompletedFlow,
  stripeWebhookHandler,
];
