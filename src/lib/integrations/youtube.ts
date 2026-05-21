import { env } from "@/env";

export interface YouTubeStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export async function getYouTubeStats(channelId: string): Promise<YouTubeStats | null> {
  if (!env.YOUTUBE_API_KEY) {
    console.warn("YOUTUBE_API_KEY is not set");
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${env.YOUTUBE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const stats = data.items[0].statistics;
      return {
        subscriberCount: parseInt(stats.subscriberCount),
        viewCount: parseInt(stats.viewCount),
        videoCount: parseInt(stats.videoCount),
      };
    }
  } catch (error) {
    console.error("[YouTube Stats] Error:", error);
  }
  
  return null;
}
