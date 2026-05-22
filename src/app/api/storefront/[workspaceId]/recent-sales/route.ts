import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 20);

  try {
    const sales = await db.recentSale.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        buyerName: true,
        productName: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ sales });
  } catch (error) {
    console.error("Error fetching recent sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent sales" },
      { status: 500 }
    );
  }
}