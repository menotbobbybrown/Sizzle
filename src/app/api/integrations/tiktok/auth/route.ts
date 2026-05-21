import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const clientKey = env.TIKTOK_CLIENT_ID;
  const redirectUri = `${env.APP_URL}/api/integrations/tiktok/callback`;
  const state = Math.random().toString(36).substring(7);
  
  const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(url);
}
