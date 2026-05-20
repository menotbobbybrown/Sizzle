import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Tracking endpoint for email opens/clicks/unsubscribes
export async function POST(req: Request) {
  try {
    const { subscriberId, campaignId, type, linkUrl, ipAddress, userAgent } = await req.json();

    if (!subscriberId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Record the event
    await db.emailEvent.create({
      data: {
        subscriberId,
        campaignId,
        type,
        linkUrl,
        ipAddress,
        userAgent,
      },
    });

    // Handle unsubscribe
    if (type === "UNSUBSCRIBED") {
      await db.subscriber.update({
        where: { id: subscriberId },
        data: {
          status: "UNSUBSCRIBED",
          unsubscribedAt: new Date(),
        },
      });
    }

    // Update campaign send tracking
    if (campaignId) {
      const statusMap: Record<string, string> = {
        OPENED: "OPENED",
        CLICKED: "CLICKED",
        BOUNCED: "BOUNCED",
      };

      if (statusMap[type]) {
        await db.campaignSend.updateMany({
          where: {
            campaignId,
            subscriberId,
          },
          data: {
            status: statusMap[type] as any,
          },
        });
      }
    }

    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.error("Campaign track error:", error);
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}