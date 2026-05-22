import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * Verify Mux webhook signature
 */
function verifyMuxSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const [timestampPart, signaturePart] = signature.split(",");
  const timestamp = timestampPart?.replace("t=", "");
  const expectedSignature = signaturePart?.replace("v1=", "");

  if (!timestamp || !expectedSignature) return false;

  // Check if the timestamp is too old (5 minutes)
  const ts = parseInt(timestamp, 10);
  if (Date.now() - ts * 1000 > 5 * 60 * 1000) {
    return false;
  }

  const payload = `${timestamp}.${body}`;
  const actualSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(actualSignature)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Mux-Signature");
  
  // Verify webhook signature
  if (env.MUX_TOKEN_SECRET) {
    if (!signature) {
      console.log("[Mux Webhook] Missing signature");
      return new NextResponse("Missing signature", { status: 401 });
    }

    if (!verifyMuxSignature(body, signature, env.MUX_TOKEN_SECRET)) {
      console.log("[Mux Webhook] Invalid signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { type, data } = payload;

  console.log(`[Mux Webhook] Received: ${type}`);

  try {
    switch (type) {
      // ============================================================
      // VIDEO ASSET READY
      // ============================================================
      case "video.asset.ready": {
        const { id: muxAssetId, playback_ids, duration, status } = data;
        
        // Find the MuxAsset record
        const muxAsset = await db.muxAsset.findFirst({
          where: { muxAssetId },
          include: { lesson: true },
        });
        
        if (muxAsset) {
          const playbackId = playback_ids?.[0]?.id;
          
          await db.muxAsset.update({
            where: { id: muxAsset.id },
            data: {
              muxPlaybackId: playbackId,
              status: "READY",
              duration: Math.round(duration ?? 0),
            },
          });
          
          console.log(`[Mux Webhook] Asset ready: ${muxAssetId}, playback: ${playbackId}`);
        } else {
          console.log(`[Mux Webhook] Asset ${muxAssetId} not found in database`);
        }
        
        break;
      }

      // ============================================================
      // VIDEO ASSET ERRORED
      // ============================================================
      case "video.asset.errored": {
        const { id: muxAssetId, errors } = data;
        
        const muxAsset = await db.muxAsset.findFirst({
          where: { muxAssetId },
        });
        
        if (muxAsset) {
          await db.muxAsset.update({
            where: { id: muxAsset.id },
            data: {
              status: "ERROR",
              metadata: { errors },
            },
          });
          
          console.error(`[Mux Webhook] Asset error: ${muxAssetId}`, errors);
        }
        
        break;
      }

      // ============================================================
      // VIDEO UPLOAD ASSET CREATED (Direct upload completed)
      // ============================================================
      case "video.upload.asset_created": {
        const { id: uploadId, asset_id, status } = data;
        
        // Find a lesson that has an upload pending for this uploadId
        // Note: We'd need to store the upload ID in the lesson or a pending upload table
        console.log(`[Mux Webhook] Upload complete: ${uploadId} -> ${asset_id}`);
        
        // You could create the MuxAsset here if you track pending uploads
        // For now, we'll rely on the asset.ready event to create the record
        
        break;
      }

      // ============================================================
      // VIDEO ASSET DELETED
      // ============================================================
      case "video.asset.deleted": {
        const { id: muxAssetId } = data;
        
        const muxAsset = await db.muxAsset.findFirst({
          where: { muxAssetId },
        });
        
        if (muxAsset) {
          await db.muxAsset.update({
            where: { id: muxAsset.id },
            data: {
              status: "DELETED",
            },
          });
          
          console.log(`[Mux Webhook] Asset deleted: ${muxAssetId}`);
        }
        
        break;
      }

      // ============================================================
      // VIDEO SIGNING KEY CREATED
      // ============================================================
      case "video.signing_key.created": {
        const { id, status } = data;
        console.log(`[Mux Webhook] Signing key created: ${id}`);
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