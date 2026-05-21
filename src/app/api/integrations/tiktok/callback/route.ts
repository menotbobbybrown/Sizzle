import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return new NextResponse("Missing code", { status: 400 });

  try {
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_ID!,
        client_secret: env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${env.APP_URL}/api/integrations/tiktok/callback`,
      }),
    });

    const data = await response.json();
    if (!data.access_token) return NextResponse.json(data, { status: 400 });

    const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userResponse.json();

    const membership = await db.workspaceMember.findFirst({
      where: { userId: session.user.id },
    });

    if (membership) {
      await db.socialConnection.upsert({
        where: {
          workspaceId_provider: {
            workspaceId: membership.workspaceId,
            provider: "tiktok",
          },
        },
        create: {
          workspaceId: membership.workspaceId,
          provider: "tiktok",
          providerId: userData.data?.user?.open_id || "unknown",
          accessToken: encrypt(data.access_token),
          refreshToken: data.refresh_token ? encrypt(data.refresh_token) : null,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
          metadata: {
            displayName: userData.data?.user?.display_name,
          },
        },
        update: {
          accessToken: encrypt(data.access_token),
          refreshToken: data.refresh_token ? encrypt(data.refresh_token) : null,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
          metadata: {
            displayName: userData.data?.user?.display_name,
          },
        },
      });
    }

    return NextResponse.redirect(`${env.APP_URL}/dashboard/settings?integration=tiktok&success=true`);
  } catch (error) {
    console.error("[TikTok Callback] Error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
