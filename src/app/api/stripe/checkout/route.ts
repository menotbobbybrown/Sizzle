import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { workspace: true },
    });

    if (!product || product.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product.workspace.stripeAccountId) {
      return NextResponse.json(
        { error: "This creator cannot accept payments yet" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.name,
              images: product.imageUrl ? [product.imageUrl] : [],
            },
            unit_amount: Math.round(Number(product.price) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?success=true`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/${product.workspace.handle}/p/${product.slug}?canceled=true`,
      metadata: {
        productId: product.id,
        workspaceId: product.workspace.id,
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