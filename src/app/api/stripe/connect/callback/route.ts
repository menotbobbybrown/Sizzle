import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(`${env.APP_URL}/dashboard?error=unauthorized`);
  }

  // Protect against tampered state
  if (state !== session.user.id) {
    return NextResponse.redirect(`${env.APP_URL}/dashboard?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${env.APP_URL}/dashboard?error=missing_code`);
  }

  try {
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = response.stripe_user_id;

    if (!stripeAccountId) {
      throw new Error("No stripe_user_id returned from Stripe");
    }

    // Persist stripeAccountId + connected status on creator workspace
    // Get the first workspace where the user is an owner/admin
    const workspaceMember = await db.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
      include: { workspace: true },
    });

    if (!workspaceMember) {
      return NextResponse.redirect(`${env.APP_URL}/dashboard?error=no_workspace`);
    }

    // Verify the account can actually accept charges before marking it ready.
    // Connecting via OAuth does NOT guarantee onboarding is complete — a creator
    // may still owe Stripe verification details. Marking a not-yet-enabled
    // account as "connected" would let us create checkouts that fail to transfer.
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const status = account.charges_enabled
      ? "connected"
      : account.details_submitted
        ? "pending_verification"
        : "onboarding_incomplete";

    await db.workspace.update({
      where: { id: workspaceMember.workspaceId },
      data: {
        stripeAccountId,
        stripeAccountStatus: status,
      },
    });

    const redirectStatus = account.charges_enabled ? "success" : "incomplete";
    return NextResponse.redirect(
      `${env.APP_URL}/dashboard/settings?stripe=${redirectStatus}`
    );
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.redirect(`${env.APP_URL}/dashboard/settings?stripe=error`);
  }
}
