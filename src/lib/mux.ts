import Mux from "@mux/mux-node";
import { env } from "@/env";

const mux = new Mux({
  tokenId: env.MUX_TOKEN_ID!,
  tokenSecret: env.MUX_TOKEN_SECRET!,
});

export const video = mux.video;

export async function createMuxUpload(corsOrigin: string) {
  return video.uploads.create({
    new_asset_settings: { 
      playback_policy: ["signed"],
    },
    cors_origin: corsOrigin,
  });
}

export async function generatePlaybackToken(playbackId: string) {
  return mux.jwt.sign(playbackId, {
    type: "video_playback_id",
  });
}

export async function getAsset(assetId: string) {
  return video.assets.retrieve(assetId);
}
