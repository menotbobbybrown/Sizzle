import { NextResponse } from "next/server";
import { env } from "@/env";

// Pusher channel authentication endpoint
export async function POST(req: Request) {
  try {
    const { socket_id: socketId, channel_name: channelName } = await req.json();
    const auth = await fetch("https://api-" + env.NEXT_PUBLIC_PUSHER_CLUSTER + ".pusher.com/apps/" + env.PUSHER_APP_ID + "/events/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
    });
    const data = await auth.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}