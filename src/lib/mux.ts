import { env } from "@/env";

type MuxClient = {
  video: {
    assets: {
      create: (params: {
        input: { url: string };
        playback_policy: string[];
        metadata?: Record<string, string>;
      }) => Promise<{ id: string; playback_ids: Array<{ id: string }>; status: string }>;
      retrieve: (id: string) => Promise<{
        id: string;
        status: string;
        duration: number;
        playback_ids: Array<{ id: string }>;
      }>;
    };
    uploads: {
      create: (params: {
        new_asset_settings: { playback_policy: string[] };
        cors_origin: string;
      }) => Promise<{ id: string; url: string }>;
    };
  };
};

let muxClient: MuxClient | null = null;

function createMuxClient(): MuxClient | null {
  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Mux = require("@mux/mux-node");
    const { video } = new Mux({
      tokenId: env.MUX_TOKEN_ID,
      tokenSecret: env.MUX_TOKEN_SECRET,
    });
    return { video };
  } catch {
    return null;
  }
}

export function getMux(): MuxClient | null {
  if (!muxClient) {
    muxClient = createMuxClient();
  }
  return muxClient;
}

export async function createMuxUpload(corsOrigin: string) {
  const mux = getMux();
  if (!mux) {
    return null;
  }
  return mux.video.uploads.create({
    new_asset_settings: { playback_policy: ["public"] },
    cors_origin: corsOrigin,
  });
}

export async function getMuxAssetStatus(assetId: string) {
  const mux = getMux();
  if (!mux) {
    return null;
  }
  return mux.video.assets.retrieve(assetId);
}