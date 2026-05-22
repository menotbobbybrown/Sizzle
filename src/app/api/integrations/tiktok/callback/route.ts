import { NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/encryption";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle error from TikTok
  if (error) {
    console.error("[TikTok OAuth] Error:", error);
    return NextResponse.redirect(`/dashboard/settings?error=tiktok_${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect("/dashboard/settings?error=tiktok_missing_params");
  }

  // Decode and verify state
  let statePayload: { workspaceId: string; userId: string; nonce: string };
  try {
    statePayload = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect("/dashboard/settings?error=tiktok_invalid_state");
  }

  const { workspaceId } = statePayload;

  // Exchange code for access token
  try {
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_KEY || "",
        client_secret: env.TIKTOK_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/integrations/tiktok/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[TikTok OAuth] Token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect("/dashboard/settings?error=tiktok_token_exchange");
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    // Get user info from TikTok
    const userResponse = await fetch(TIKTOK_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    let platformUsername = "";
    if (userResponse.ok) {
      const userData = await userResponse.json();
      platformUsername = userData.data?.user?.display_name || "";
    }

    // Encrypt tokens for storage
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);

    // Calculate expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert social connection
    await db.socialConnection.upsert({
      where: {
        workspaceId_platform: {
          workspaceId,
          platform: "TIKTOK",
        },
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        platformUserId: tokenData.open_id,
        platformUsername,
      },
      create: {
        workspaceId,
        platform: "TIKTOK",
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        platformUserId: tokenData.open_id,
        platformUsername,
      },
    });

    return NextResponse.redirect(`/dashboard/settings?success=tiktok_connected`);
  } catch (error) {
    console.error("[TikTok OAuth] Error:", error);
    return NextResponse.redirect("/dashboard/settings?error=tiktok_connection_failed");
  }
}

/**
 * Get a valid access token for TikTok API (handles refresh)
 */
export async function getValidAccessToken(workspaceId: string): Promise<string | null> {
  const connection = await db.socialConnection.findUnique({
    where: {
      workspaceId_platform: {
        workspaceId,
        platform: "TIKTOK",
      },
    },
  });

  if (!connection || !connection.accessToken || connection.status !== "CONNECTED") {
    return null;
  }

  // Check if token is expired
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    // Need to refresh
    if (!connection.refreshToken) {
      return null;
    }

    try {
      const refreshResponse = await fetch(TIKTOK_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: env.TIKTOK_CLIENT_KEY || "",
          client_secret: env.TIKTOK_CLIENT_SECRET || "",
          grant_type: "refresh_token",
          refresh_token: decryptToken(connection.refreshToken),
        }),
      });

      if (!refreshResponse.ok) {
        // Mark as disconnected
        await db.socialConnection.update({
          where: { id: connection.id },
          data: { status: "DISCONNECTED" },
        });
        return null;
      }

      const tokenData: TokenResponse = await refreshResponse.json();

      // Update stored tokens
      await db.socialConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: encryptToken(tokenData.access_token),
          refreshToken: encryptToken(tokenData.refresh_token),
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        },
      });

      return tokenData.access_token;
    } catch {
      return null;
    }
  }

  return decryptToken(connection.accessToken);
}