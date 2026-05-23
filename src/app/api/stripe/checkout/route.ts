import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutLimiter, getClientIP, checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // Apply rate limiting
  const ip = getClientIP(req);
  const rateLimitResponse = await checkRateLimit(checkoutLimiter, ip);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { productId, customAmount, discountCode } = await req.json();

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    // Validate custom amount for PWYW products
    if (customAmount !== undefined) {
      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      if (product.pricingType === "PWYW") {
        const minPrice = product.minPrice ? Number(product.minPrice) : 1;
        if (customAmount < minPrice) {
          return NextResponse.json(
            { error: `Minimum price is $${minPrice}` },
            { status: 400 }
          );
        }
      } else if (product.pricingType === "FREE") {
        return NextResponse.json(
          { error: "This product is free" },
          { status: 400 }
        );
      }
    }

    const session_auth = await auth();
    const userId = session_auth?.user?.id ?? "";

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { workspace: true },
    });

    if (!product || product.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product.workspace.stripeAccountId) {
      return NextResponse.json(
        { error: "This creator cannot accept payments yet. Please contact them or try again later." },
        { status: 400 }
      );
    }

    // Build line items based on pricing type
    let unitAmount: number;
    
    if (product.pricingType === "PWYW" && customAmount) {
      // Use custom amount for PWYW products
      unitAmount = Math.round(customAmount * 100);
    } else if (product.pricingType === "FREE") {
      // Handle free products - redirect to direct access
      return NextResponse.json({ 
        url: `${env.NEXT_PUBLIC_APP_URL}/enroll/${productId}?free=true`,
        isFree: true 
      });
    } else {
      // Fixed price
      unitAmount = Math.round(Number(product.price) * 100);
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

    // Read affiliate code from cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const affiliateCode = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("sizzle_ref="))
      ?.split("=")[1];

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
      success_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?success=true`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?canceled=true`,
      payment_intent_data: {
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

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
