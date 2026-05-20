import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

type Props = {
  params: Promise<{ token: string }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  const accessToken = await db.accessToken.findUnique({
    where: { tokenHash },
    include: { product: true },
  });

  if (!accessToken) {
    return new NextResponse("Invalid download token", { status: 404 });
  }

  if (accessToken.revokedAt) {
    return new NextResponse("Download link has been revoked", { status: 403 });
  }

  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
    return new NextResponse("Download link has expired", { status: 410 });
  }

  if (accessToken.useCount >= accessToken.maxUses) {
    return new NextResponse("Download limit reached", { status: 403 });
  }

  // Increment use count
  await db.accessToken.update({
    where: { tokenHash },
    data: {
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  // TODO: Stream actual file from R2/S3
  // For now, return a JSON response indicating download was tracked
  // In production, this would stream the actual file:
  // const file = await getFileFromR2(accessToken.product.fileKey);
  // return new Response(file.body, {
  //   headers: {
  //     'Content-Type': file.contentType,
  //     'Content-Disposition': `attachment; filename="${file.filename}"`,
  //   },
  // });

  return NextResponse.json({
    success: true,
    message: "Download tracked",
    productId: accessToken.productId,
    useCount: accessToken.useCount + 1,
    remainingUses: accessToken.maxUses - (accessToken.useCount + 1),
  });
}