import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;

  console.log(`[Mux Webhook] Received: ${type}`);

  try {
    switch (type) {
      case "video.asset.ready": {
        const assetId = data.id;
        const playbackId = data.playback_ids?.[0]?.id;
        const duration = Math.round(data.duration);

        await db.muxAsset.updateMany({
          where: { muxAssetId: assetId },
          data: {
            muxPlaybackId: playbackId,
            status: "READY",
            duration: duration,
          },
        });
        break;
      }
      case "video.asset.errored": {
        const assetId = data.id;
        await db.muxAsset.updateMany({
          where: { muxAssetId: assetId },
          data: {
            status: "ERROR",
          },
        });
        break;
      }
      case "video.asset.deleted": {
        const assetId = data.id;
        await db.muxAsset.updateMany({
          where: { muxAssetId: assetId },
          data: {
            status: "DELETED",
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Mux Webhook] Error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
