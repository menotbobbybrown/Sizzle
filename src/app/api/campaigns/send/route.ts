import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { campaignId } = await req.json();

    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: { segment: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Update campaign status to sending
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING", sentAt: new Date() },
    });

    // Get subscribers based on segment or all
    const subscribers = await db.subscriber.findMany({
      where: {
        workspaceId: campaign.workspaceId,
        status: "ACTIVE",
        ...(campaign.segmentId
          ? {
              // Apply segment filtering via metadata or purchases
              // This simplified version fetches all active subscribers;
              // a production implementation would evaluate segment.rules
            }
          : {}),
      },
    });

    // Send emails (in production, use a queue system)
    const sends = [];
    for (const subscriber of subscribers) {
      try {
        await sendEmail({
          to: subscriber.email,
          subject: campaign.subject,
          html: campaign.htmlContent,
          from: campaign.fromName
            ? `${campaign.fromName} <${campaign.replyTo ?? "noreply@sizzle.so"}>`
            : undefined,
          replyTo: campaign.replyTo ?? undefined,
          tags: [
            { name: "campaignId", value: campaignId },
            { name: "subscriberId", value: subscriber.id },
          ],
        });

        sends.push({
          campaignId,
          subscriberId: subscriber.id,
          status: "SENT" as const,
          sentAt: new Date(),
        });
      } catch (error) {
        sends.push({
          campaignId,
          subscriberId: subscriber.id,
          status: "FAILED" as const,
          error: String(error),
        });
      }
    }

    // Record sends in bulk
    if (sends.length > 0) {
      await db.campaignSend.createMany({ data: sends });
    }

    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT" },
    });

    return NextResponse.json({ sent: sends.length, failed: subscribers.length - sends.length });
  } catch (error) {
    console.error("Campaign send error:", error);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}