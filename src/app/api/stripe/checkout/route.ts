import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutLimiter, checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await checkRateLimit(checkoutLimiter, ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { productId, customAmount, affiliateCode } = await req.json();

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const session_auth = await auth();
    const userId = session_auth?.user?.id ?? "";

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { 
        workspace: true,
        membershipConfig: true,
      },
    });

    if (!product || product.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product.workspace.stripeAccountId) {
      return NextResponse.json(
        { error: "This creator cannot accept payments yet." },
        { status: 400 }
      );
    }

    let unitAmount = Math.round(Number(product.price) * 100);
    
    if (product.pricingType === "PWYW") {
      const amount = Number(customAmount);
      const minPrice = Number(product.minPrice) || 0;
      if (isNaN(amount) || amount < minPrice) {
        return NextResponse.json({ error: `Minimum price is ${minPrice}` }, { status: 400 });
      }
      unitAmount = Math.round(amount * 100);
    }

    const isSubscription = product.type === "MEMBERSHIP";
    
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.name,
              images: product.imageUrl ? [product.imageUrl] : [],
            },
            unit_amount: unitAmount,
            ...(isSubscription && product.membershipConfig ? {
              recurring: {
                interval: product.membershipConfig.interval.toLowerCase() as any,
              }
            } : {}),
          },
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?success=true`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?canceled=true`,
      ...(isSubscription ? {} : {
        payment_intent_data: {
          transfer_data: {
            destination: product.workspace.stripeAccountId,
          },
        },
      }),
      subscription_data: isSubscription ? {
        transfer_data: {
          destination: product.workspace.stripeAccountId,
        },
        metadata: {
          productId: product.id,
          workspaceId: product.workspace.id,
          userId: userId,
        }
      } : undefined,
      metadata: {
        productId: product.id,
        workspaceId: product.workspace.id,
        userId: userId,
        affiliateCode: affiliateCode || "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
