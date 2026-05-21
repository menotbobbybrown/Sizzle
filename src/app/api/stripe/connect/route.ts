import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate OAuth authorize URL
  // We use the user ID as the state to verify it in the callback
  const stripeUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${env.STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${encodeURIComponent(`${env.APP_URL}/api/stripe/connect/callback`)}&state=${session.user.id}`;

  return NextResponse.redirect(stripeUrl);
}
