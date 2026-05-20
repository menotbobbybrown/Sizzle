import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { generateWithClaude } from "@/lib/ai/claude";

export const aiRouter = createTRPCRouter({
  generate: creatorProcedure
    .input(
      z.object({
        feature: z.enum([
          "title",
          "description",
          "email",
          "lessonOutline",
          "lessonContent",
          "campaignSubject",
          "campaignBody",
        ]),
        context: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await generateWithClaude(input.feature, input.context);

      if (!result) {
        throw new Error("AI generation failed - check API key configuration");
      }

      // Log the generation
      await ctx.db.aiGenerationLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          userId: ctx.session.user.id,
          prompt: input.context,
          result: result.content,
          model: "claude-sonnet-4-20250514",
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          feature: input.feature,
        },
      });

      return result;
    }),

  getUsage: creatorProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalGenerations, monthGenerations, monthTokens] = await Promise.all([
      ctx.db.aiGenerationLog.count({
        where: { workspaceId: ctx.workspace.id },
      }),
      ctx.db.aiGenerationLog.count({
        where: {
          workspaceId: ctx.workspace.id,
          createdAt: { gte: startOfMonth },
        },
      }),
      ctx.db.aiGenerationLog.aggregate({
        where: {
          workspaceId: ctx.workspace.id,
          createdAt: { gte: startOfMonth },
        },
        _sum: { tokensIn: true, tokensOut: true },
      }),
    ]);

    return {
      totalGenerations,
      monthGenerations,
      monthTokensIn: monthTokens._sum.tokensIn ?? 0,
      monthTokensOut: monthTokens._sum.tokensOut ?? 0,
    };
  }),
});