import { NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubeChannelStats {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
}

/**
 * Fetch YouTube channel statistics
 */
export async function getYouTubeChannelStats(channelId: string): Promise<YouTubeChannelStats | null> {
  if (!env.YOUTUBE_API_KEY) {
    console.error("YouTube API key not configured");
    return null;
  }

  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      console.error("YouTube API error:", await response.text());
      return null;
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const channel = data.items[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      customUrl: channel.snippet.customUrl || "",
      thumbnailUrl: channel.snippet.thumbnails?.default?.url || "",
      subscriberCount: parseInt(channel.statistics.subscriberCount || "0", 10),
      videoCount: parseInt(channel.statistics.videoCount || "0", 10),
      viewCount: parseInt(channel.statistics.viewCount || "0", 10),
    };
  } catch (error) {
    console.error("Error fetching YouTube stats:", error);
    return null;
  }
}

/**
 * Fetch recent videos from a YouTube channel
 */
export async function getYouTubeVideos(channelId: string, maxResults = 10): Promise<YouTubeVideo[]> {
  if (!env.YOUTUBE_API_KEY) {
    return [];
  }

  try {
    // First get the uploads playlist ID
    const channelResponse = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=contentDetails&id=${channelId}&key=${env.YOUTUBE_API_KEY}`
    );

    if (!channelResponse.ok) {
      return [];
    }

    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      return [];
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Then fetch videos from the uploads playlist
    const videosResponse = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${env.YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      return [];
    }

    const videosData = await videosResponse.json();

    return (videosData.items || []).map((item: any) => ({
      id: item.contentDetails?.videoId || item.snippet.resourceId?.videoId || "",
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || "",
      publishedAt: item.snippet.publishedAt,
      duration: item.contentDetails?.duration || "",
      viewCount: parseInt(item.contentDetails?.viewCount || "0", 10),
      likeCount: parseInt(item.contentDetails?.likeCount || "0", 10),
    }));
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return [];
  }
}

/**
 * API route to get YouTube stats for a workspace
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  // Verify user has access to this workspace
  const membership = await db.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspaceId,
      role: { in: ["OWNER", "ADMIN"] },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get YouTube connection
  const connection = await db.socialConnection.findUnique({
    where: {
      workspaceId_platform: {
        workspaceId,
        platform: "YOUTUBE",
      },
    },
  });

  if (!connection || !connection.channelId) {
    return NextResponse.json({ error: "YouTube not connected" }, { status: 404 });
  }

  const stats = await getYouTubeChannelStats(connection.channelId);
  const videos = await getYouTubeVideos(connection.channelId, 5);

  // Update stored subscriber count
  if (stats) {
    await db.socialConnection.update({
      where: { id: connection.id },
      data: {
        subscriberCount: stats.subscriberCount,
      },
    });
  }

  return NextResponse.json({
    stats,
    recentVideos: videos,
  });
}

/**
 * API route to set YouTube channel ID for a workspace
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, channelId } = await req.json();

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  // Verify user has access to this workspace
  const membership = await db.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspaceId,
      role: { in: ["OWNER", "ADMIN"] },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Validate channel ID by fetching stats
  let channelStats = null;
  if (channelId && env.YOUTUBE_API_KEY) {
    channelStats = await getYouTubeChannelStats(channelId);
  }

  // Upsert YouTube connection
  await db.socialConnection.upsert({
    where: {
      workspaceId_platform: {
        workspaceId,
        platform: "YOUTUBE",
      },
    },
    update: {
      channelId,
      status: channelStats ? "CONNECTED" : "DISCONNECTED",
      subscriberCount: channelStats?.subscriberCount,
      platformUsername: channelStats?.title,
    },
    create: {
      workspaceId,
      platform: "YOUTUBE",
      status: channelStats ? "CONNECTED" : "DISCONNECTED",
      channelId,
      subscriberCount: channelStats?.subscriberCount,
      platformUsername: channelStats?.title,
    },
  });

  return NextResponse.json({
    success: true,
    stats: channelStats,
  });
}