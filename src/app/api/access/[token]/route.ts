import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

type Props = {
  params: Promise<{ token: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  const accessToken = await db.accessToken.findUnique({
    where: { tokenHash },
    include: { product: true },
  });

  if (!accessToken) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  // Check if revoked
  if (accessToken.revokedAt) {
    return NextResponse.json({ error: "Token has been revoked" }, { status: 403 });
  }

  // Check if expired
  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token has expired" }, { status: 410 });
  }

  // Check usage limit
  if (accessToken.useCount >= accessToken.maxUses) {
    return NextResponse.json({ error: "Token usage limit exceeded" }, { status: 429 });
  }

  // Increment usage
  await db.accessToken.update({
    where: { id: accessToken.id },
    data: {
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  // Return the product or resource the token grants access to
  return NextResponse.json({
    product: {
      id: accessToken.product.id,
      name: accessToken.product.name,
      type: accessToken.product.type,
    },
    orderId: accessToken.orderId,
  });
}