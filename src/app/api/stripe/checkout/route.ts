import { NextResponse } from "next/server";
import {
  stripe,
  computeApplicationFee,
  getPlatformFeePercent,
  stripeInterval,
} from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutLimiter, getClientIP, checkRateLimit } from "@/lib/ratelimit";

/**
 * Server-side checkout entry point used by the storefront's progressively
 * enhanced "Buy now" form. It accepts either:
 *   - a native `application/x-www-form-urlencoded` submit (no JS) → responds
 *     with a 303 redirect straight to Stripe Checkout, and
 *   - a JSON `fetch` (PWYW / discounts) → responds with `{ url }`.
 *
 * It mirrors the tRPC `checkout.createSession` procedure exactly (same metadata,
 * same platform fee, same success page) so the two entry points can never drift.
 */
type CheckoutBody = {
  productId?: string;
  customAmount?: number;
  discountCode?: string;
};

async function parseBody(req: Request): Promise<{ body: CheckoutBody; wantsRedirect: boolean }> {
  const contentType = req.headers.get("content-type") ?? "";

  // Native HTML form submit → redirect the browser to Stripe.
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData();
    const rawAmount = form.get("customAmount");
    return {
      wantsRedirect: true,
      body: {
        productId: (form.get("productId") as string) || undefined,
        discountCode: (form.get("discountCode") as string) || undefined,
        customAmount: rawAmount ? Number(rawAmount) : undefined,
      },
    };
  }

  // Programmatic fetch → return JSON.
  const json = (await req.json().catch(() => ({}))) as CheckoutBody;
  return { wantsRedirect: false, body: json };
}

function fail(message: string, status: number, wantsRedirect: boolean): NextResponse {
  if (wantsRedirect) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/checkout/error?message=${encodeURIComponent(message)}`,
      303
    );
  }
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  // Apply rate limiting
  const ip = getClientIP(req);
  const rateLimitResponse = await checkRateLimit(checkoutLimiter, ip);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let wantsRedirect = false;

  try {
    const parsed = await parseBody(req);
    wantsRedirect = parsed.wantsRedirect;
    const { productId, customAmount, discountCode } = parsed.body;

    if (!productId || typeof productId !== "string") {
      return fail("Missing productId", 400, wantsRedirect);
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { workspace: true, membershipConfig: true },
    });

    if (!product || product.status !== "PUBLISHED") {
      return fail("Product not found", 404, wantsRedirect);
    }

    // Validate custom amount for PWYW products
    if (customAmount !== undefined) {
      if (product.pricingType === "PWYW") {
        const minPrice = product.minPrice ? Number(product.minPrice) : 1;
        if (customAmount < minPrice) {
          return fail(`Minimum price is $${minPrice}`, 400, wantsRedirect);
        }
      } else if (product.pricingType === "FREE") {
        return fail("This product is free", 400, wantsRedirect);
      }
    }

    const session_auth = await auth();
    const userId = session_auth?.user?.id ?? "";

    // Membership products bill recurringly via a Stripe subscription and must be
    // tied to a signed-in account. Handle them before the one-time flow.
    const isMembership =
      product.type === "MEMBERSHIP" && !!product.membershipConfig?.interval;

    if (isMembership) {
      if (!userId) {
        return fail("Please sign in to start a membership.", 401, wantsRedirect);
      }
      if (
        !product.workspace.stripeAccountId ||
        product.workspace.stripeAccountStatus !== "connected"
      ) {
        return fail(
          "This creator cannot accept payments yet. Please try again later.",
          400,
          wantsRedirect
        );
      }

      const feePercent = getPlatformFeePercent(product.workspace.plan);
      const membershipMetadata: Record<string, string> = {
        kind: "membership",
        productId: product.id,
        workspaceId: product.workspace.id,
        userId,
      };

      const membershipSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product=${product.slug}`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?canceled=true`,
        customer_email: session_auth?.user?.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: product.currency.toLowerCase(),
              product_data: {
                name: product.name,
                images: product.imageUrl ? [product.imageUrl] : [],
              },
              unit_amount: Math.round(Number(product.price) * 100),
              recurring: {
                interval: stripeInterval(product.membershipConfig!.interval!),
                interval_count: product.membershipConfig!.intervalCount,
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          ...(feePercent > 0 ? { application_fee_percent: feePercent } : {}),
          transfer_data: { destination: product.workspace.stripeAccountId },
          metadata: membershipMetadata,
        },
        metadata: membershipMetadata,
      });

      if (!membershipSession.url) {
        return fail("Failed to create checkout session", 500, wantsRedirect);
      }
      return wantsRedirect
        ? NextResponse.redirect(membershipSession.url, 303)
        : NextResponse.json({ url: membershipSession.url });
    }

    // Build line items based on pricing type
    let unitAmount: number;

    if (product.pricingType === "PWYW" && customAmount) {
      // Use custom amount for PWYW products
      unitAmount = Math.round(customAmount * 100);
    } else if (product.pricingType === "FREE") {
      // Free products don't go through Stripe — grant access directly.
      const freeUrl = `${env.NEXT_PUBLIC_APP_URL}/enroll/${productId}?free=true`;
      return wantsRedirect
        ? NextResponse.redirect(freeUrl, 303)
        : NextResponse.json({ url: freeUrl, isFree: true });
    } else {
      // Fixed price
      unitAmount = Math.round(Number(product.price) * 100);
    }

    if (
      !product.workspace.stripeAccountId ||
      product.workspace.stripeAccountStatus !== "connected"
    ) {
      return fail(
        "This creator cannot accept payments yet. Please contact them or try again later.",
        400,
        wantsRedirect
      );
    }

    // Apply discount if provided
    if (discountCode) {
      const discount = await db.discountCode.findUnique({
        where: { code: discountCode.toUpperCase() },
      });

      if (
        discount &&
        discount.isActive &&
        (!discount.maxUses || discount.usedCount < discount.maxUses) &&
        (!discount.expiresAt || discount.expiresAt > new Date())
      ) {
        if (discount.type === "PERCENTAGE") {
          unitAmount = Math.round(unitAmount * (1 - Number(discount.value) / 100));
        } else {
          unitAmount = Math.max(0, unitAmount - Number(discount.value) * 100);
        }
      }
    }

    // Read affiliate code from cookie (captured by middleware as `sizzle_ref`)
    const cookieHeader = req.headers.get("cookie") || "";
    const affiliateCode = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("sizzle_ref="))
      ?.split("=")[1];

    const applicationFee = computeApplicationFee(unitAmount, product.workspace.plan);

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.name,
              images: product.imageUrl ? [product.imageUrl] : [],
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product=${product.slug}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?canceled=true`,
      payment_intent_data: {
        ...(applicationFee > 0 ? { application_fee_amount: applicationFee } : {}),
        transfer_data: {
          destination: product.workspace.stripeAccountId,
        },
      },
      metadata: {
        productId: product.id,
        workspaceId: product.workspace.id,
        userId: userId,
        discountCode: discountCode || "",
        pricingType: product.pricingType,
        ...(affiliateCode ? { affiliateCode } : {}),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return fail("Failed to create checkout session", 500, wantsRedirect);
    }

    return wantsRedirect
      ? NextResponse.redirect(session.url, 303)
      : NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return fail("Failed to create checkout session", 500, wantsRedirect);
  }
}
