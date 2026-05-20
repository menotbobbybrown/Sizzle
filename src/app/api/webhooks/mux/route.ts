import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import crypto from "crypto";

/**
 * Mux Webhook Handler
 * 
 * Handles Mux video processing events:
 * - video.asset.ready (when video processing is complete)
 * - video.asset.errored (when video processing fails)
 * - video.upload.asset_created (when direct upload is ready)
 */
export async function POST(req: NextRequest) {
  // Verify webhook signature
  const signature = (await headers()).get("Mux-Signature");
  
  if (!signature && env.MUX_TOKEN_SECRET) {
    return new NextResponse("Missing Mux signature", { status: 401 });
  }

  // TODO: Verify Mux webhook signature
  // Mux uses a similar HMAC-based verification as Stripe
  // const payload = await req.text();
  // const expectedSignature = crypto
  //   .createHmac("sha256", env.MUX_TOKEN_SECRET!)
  //   .update(payload)
  //   .digest("hex");
  // if (signature !== `ts=${Date.now()},v1=${expectedSignature}`) {
  //   return new NextResponse("Invalid signature", { status: 401 });
  // }

  const body = await req.json();
  const { type, data } = body;

  console.log(`[Mux Webhook] Received: ${type}`);

  try {
    switch (type) {
      case "video.asset.ready": {
        // Video is ready - update lesson with Mux playback ID
        const { id: muxAssetId, playback_ids, duration, status } = data;
        
        if (playback_ids && playback_ids.length > 0) {
          const playbackId = playback_ids[0]?.id;
          
          // TODO: Update MuxAsset record with playback ID and status
          // await db.muxAsset.update({
          //   where: { muxAssetId },
          //   data: {
          //     muxPlaybackId: playbackId,
          //     status: "READY",
          //     duration: Math.round(duration ?? 0),
          //   },
          // });
          
          console.log(`[Mux Webhook] Asset ready: ${muxAssetId}, playback: ${playbackId}`);
        }
        break;
      }

      case "video.asset.errored": {
        // Video processing failed
        const { id: muxAssetId } = data;
        
        // TODO: Update MuxAsset record with error status
        // await db.muxAsset.update({
        //   where: { muxAssetId },
        //   data: { status: "ERROR" },
        // });
        
        console.error(`[Mux Webhook] Asset error: ${muxAssetId}`);
        break;
      }

      case "video.upload.asset_created": {
        // Direct upload completed - create MuxAsset for lesson
        const { id: uploadId, asset_id } = data;
        
        // TODO: Create MuxAsset record linked to the lesson
        // This would be linked via the upload ID stored in the lesson
        // await db.muxAsset.create({
        //   data: {
        //     muxAssetId: asset_id,
        //     lessonId: lessonId, // Look up by upload ID
        //     status: "PREPARING",
        //   },
        // });
        
        console.log(`[Mux Webhook] Upload complete: ${uploadId} -> ${asset_id}`);
        break;
      }

      default:
        console.log(`[Mux Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Mux Webhook] Error processing event:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}