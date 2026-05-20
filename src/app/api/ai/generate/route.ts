import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateWithClaude } from "@/lib/ai/claude";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { feature, context } = await req.json();

    if (!feature || !context) {
      return NextResponse.json(
        { error: "Missing feature or context" },
        { status: 400 }
      );
    }

    const result = await generateWithClaude(feature, context);

    if (!result) {
      return NextResponse.json(
        { error: "AI generation failed - check API key configuration" },
        { status: 500 }
      );
    }

    // Log the generation for audit and quota tracking
    await db.aiGenerationLog.create({
      data: {
        workspaceId: "unknown", // Would be resolved from session
        userId: session.user.id,
        prompt: context,
        result: result.content,
        model: "claude-sonnet-4-20250514",
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        feature,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}