import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptToken } from "@/lib/encryption";

// TikTok OAuth configuration
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const SCOPE = "user.info.basic,video.list";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get workspace ID from query params
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

  // Generate state for CSRF protection
  const state = randomBytes(32).toString("base64url");
  const statePayload = {
    workspaceId,
    userId: session.user.id,
    nonce: randomBytes(16).toString("hex"),
  };
  
  // Store state in a temporary cookie or verify against stored state
  // For production, you'd store this in a database or Redis
  const stateEncoded = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  // Build TikTok OAuth URL
  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/integrations/tiktok/callback`;
  
  const params = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY || "",
    redirect_uri: redirectUri,
    scope: SCOPE,
    response_type: "code",
    state: stateEncoded,
  });

  return NextResponse.redirect(`${TIKTOK_AUTH_URL}?${params.toString()}`);
}