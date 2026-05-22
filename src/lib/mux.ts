import { env } from "@/env";
import { db } from "@/lib/db";

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
    playbackAccessTokens: {
      create: (params: {
        assetId: string;
        expiration: string;
      }) => Promise<{ token: string }>;
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

/**
 * Create a direct upload URL for video uploads
 */
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

/**
 * Get the status of a Mux asset
 */
export async function getMuxAssetStatus(assetId: string) {
  const mux = getMux();
  if (!mux) {
    return null;
  }
  return mux.video.assets.retrieve(assetId);
}

/**
 * Create a direct upload for a lesson
 * Returns the upload URL and ID
 */
export async function createLessonUpload(lessonId: string, corsOrigin: string) {
  const mux = getMux();
  if (!mux) {
    return null;
  }

  const upload = await mux.video.uploads.create({
    new_asset_settings: { playback_policy: ["public"] },
    cors_origin: corsOrigin,
  });

  // Store the upload ID on the lesson (we'll use metadata in a pending uploads table)
  // For now, return the upload details
  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
  };
}

/**
 * Generate a signed playback token for a video
 * Only for enrolled users
 */
export async function generateSignedPlaybackToken(
  lessonId: string,
  userId: string
): Promise<string | null> {
  const mux = getMux();
  if (!mux) {
    return null;
  }

  // Find the lesson and its Mux asset
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              product: true,
            },
          },
        },
      },
      muxAsset: true,
    },
  });

  if (!lesson?.muxAsset) {
    return null;
  }

  if (lesson.muxAsset.status !== "READY" || !lesson.muxAsset.muxPlaybackId) {
    return null;
  }

  // Check if user is enrolled in this course
  if (lesson.module.course.product.type === "COURSE") {
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: lesson.module.course.productId,
        },
      },
    });

    if (!enrollment) {
      return null;
    }
  }

  // Generate signed playback token (valid for 6 hours)
  const expiration = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  
  const response = await mux.video.playbackAccessTokens.create({
    assetId: lesson.muxAsset.muxAssetId,
    expiration,
  });

  return response.token;
}

/**
 * Create a MuxAsset record for a lesson
 */
export async function createMuxAssetForLesson(
  lessonId: string,
  muxAssetId: string
) {
  return db.muxAsset.create({
    data: {
      lessonId,
      muxAssetId,
      status: "PREPARING",
    },
  });
}

/**
 * Update MuxAsset with playback ID after video is ready
 */
export async function updateMuxAssetReady(
  lessonId: string,
  muxAssetId: string,
  playbackId: string,
  duration?: number
) {
  return db.muxAsset.update({
    where: { lessonId },
    data: {
      muxAssetId,
      muxPlaybackId: playbackId,
      status: "READY",
      duration: duration ? Math.round(duration) : null,
    },
  });
}