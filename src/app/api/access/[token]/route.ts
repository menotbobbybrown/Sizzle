import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { generateDownloadUrl } from "@/lib/r2";
import { env } from "@/env";

type Props = {
  params: Promise<{ token: string }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  // Lookup access token with product include
  const accessToken = await db.accessToken.findUnique({
    where: { tokenHash },
    include: { 
      product: {
        include: { workspace: true }
      },
      order: true
    },
  });

  if (!accessToken) {
    return new NextResponse("Invalid download token", { status: 404 });
  }

  // Check revoked
  if (accessToken.revokedAt) {
    return new NextResponse("Download link has been revoked", { status: 403 });
  }

  // Check expired
  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
    return new NextResponse("Download link has expired", { status: 410 });
  }

  // Check max uses using atomic conditional increment to avoid race conditions
  if (accessToken.useCount >= accessToken.maxUses) {
    return new NextResponse("Download limit reached", { status: 403 });
  }

  // Atomic increment with condition to prevent race condition
  const updated = await db.accessToken.updateMany({
    where: {
      tokenHash,
      useCount: { lt: accessToken.maxUses },
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    data: {
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  // If no rows updated, another request consumed the last slot
  if (updated.count === 0) {
    return new NextResponse("Download limit reached", { status: 403 });
  }

  // Handle file delivery
  if (accessToken.product.fileKey) {
    // Generate short-lived R2 download URL (5 minutes)
    const downloadUrl = await generateDownloadUrl(
      accessToken.product.fileKey,
      accessToken.product.fileName ?? accessToken.product.name,
      300 // 5 minutes
    );

    // Redirect to the R2 download URL
    return NextResponse.redirect(downloadUrl, 302);
  }

  // Handle products without files
  if (accessToken.product.type === "COURSE") {
    // Courses need enrollment, redirect to enrollment page
    const enrollUrl = `${env.NEXT_PUBLIC_APP_URL}/${accessToken.product.workspace.handle}?enroll=${accessToken.product.slug}`;
    return NextResponse.redirect(enrollUrl, 302);
  }

  // No file available
  return new NextResponse("Download not available", { status: 404 });
}