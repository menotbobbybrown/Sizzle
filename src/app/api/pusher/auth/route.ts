import { NextResponse } from "next/server";
import { env } from "@/env";
import { auth } from "@/lib/auth";

// Pusher channel authentication endpoint
// Uses the private channel auth mechanism: https://pusher.com/docs/channels/server_api/authenticating-users/
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { socket_id: socketId, channel_name: channelName } = await req.json();

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    // Validate that the user has access to the channel
    // Channel format: private-workspace-{workspaceId}
    // We verify the user is a member of the workspace
    if (channelName.startsWith("private-workspace-")) {
      const workspaceId = channelName.replace("private-workspace-", "");
      const membership = await (await import("@/lib/db")).db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: session.user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Sign the auth response using HMAC-SHA256
    // Auth string format: {socket_id}:{channel_name}
    const authString = `${socketId}:${channelName}`;
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", env.PUSHER_SECRET ?? "")
      .update(authString)
      .digest("hex");

    return NextResponse.json({
      auth: `${env.PUSHER_KEY}:${signature}`,
    });
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}