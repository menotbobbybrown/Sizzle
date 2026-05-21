import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getPusher } from "@/lib/pusher";
import { generateCertificate } from "@/lib/certificates";

export const postPurchase = inngest.createFunction(
  { id: "post-purchase" },
  { event: "shop/order.paid" },
  async ({ event, step }) => {
    const { orderId } = event.data;

    const order = await step.run("fetch-order", async () => {
      return db.order.findUnique({
        where: { id: orderId },
        include: {
          workspace: true,
          user: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    if (!order) return;

    await step.run("send-purchase-email", async () => {
      const email = order.customerEmail || order.user?.email;
      if (!email) return;

      await sendEmail({
        to: email,
        subject: `Thank you for your purchase from ${order.workspace.name}`,
        html: `<h1>Thank you!</h1><p>Your order for ${order.items.map(i => i.product.name).join(", ")} was successful.</p>`,
      });
    });

    await step.run("update-analytics", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.analyticsDaily.upsert({
        where: {
          workspaceId_date: {
            workspaceId: order.workspaceId,
            date: today,
          },
        },
        create: {
          workspaceId: order.workspaceId,
          date: today,
          gmv: order.amount,
          netRevenue: order.amount,
          orderCount: 1,
        },
        update: {
          gmv: { increment: order.amount },
          netRevenue: { increment: order.amount },
          orderCount: { increment: 1 },
        },
      });
    });

    await step.run("realtime-notification", async () => {
      const pusher = getPusher();
      await pusher.trigger(
        `private-workspace-${order.workspaceId}`,
        "new-sale",
        {
          amount: order.amount,
          customerName: order.customerName,
          orderId: order.id,
          productNames: order.items.map(i => i.product.name),
        }
      );
    });

    await step.run("upsert-subscriber", async () => {
      const email = order.customerEmail || order.user?.email;
      if (!email) return;

      await db.subscriber.upsert({
        where: {
          workspaceId_email: {
            workspaceId: order.workspaceId,
            email,
          },
        },
        create: {
          workspaceId: order.workspaceId,
          email,
          name: order.customerName,
          status: "ACTIVE",
        },
        update: {
          name: order.customerName,
        },
      });
    });

    await step.run("create-recent-sale", async () => {
      if (order.items.length === 0) return;
      
      await db.recentSale.create({
        data: {
          workspaceId: order.workspaceId,
          productId: order.items[0].productId,
          buyerName: order.customerName || "Someone",
          amount: order.amount,
        },
      });
    });
  }
);

export const bookingCreated = inngest.createFunction(
  { id: "booking-created" },
  { event: "cal/booking.created" },
  async ({ event, step }) => {
    const { bookingId } = event.data;
    // Implementation for booking notification/emails
  }
);

export const bookingCancelled = inngest.createFunction(
  { id: "booking-cancelled" },
  { event: "cal/booking.cancelled" },
  async ({ event, step }) => {
    const { bookingId } = event.data;
    // Implementation for booking cancellation notification/emails
  }
);

export const courseCompleted = inngest.createFunction(
  { id: "course-completed" },
  { event: "course/completed" },
  async ({ event, step }) => {
    const { enrollmentId } = event.data;

    const certificateUrl = await step.run("generate-certificate", async () => {
      return generateCertificate(enrollmentId);
    });

    if (certificateUrl) {
      await step.run("send-completion-email", async () => {
        const enrollment = await db.enrollment.findUnique({
          where: { id: enrollmentId },
          include: { user: true, product: true },
        });
        if (!enrollment?.user?.email) return;

        await sendEmail({
          to: enrollment.user.email,
          subject: `Congratulations on completing ${enrollment.product.name}!`,
          html: `<h1>Well done!</h1><p>You have successfully completed the course. You can download your certificate here: <a href="${certificateUrl}">${certificateUrl}</a></p>`,
        });
      });
    }
  }
);
