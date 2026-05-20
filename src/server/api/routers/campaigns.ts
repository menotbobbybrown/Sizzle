import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { CampaignStatus } from "@prisma/client";

export const campaignRouter = createTRPCRouter({
  getAll: creatorProcedure.query(({ ctx }) => {
    return ctx.db.campaign.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { _count: { select: { sends: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: creatorProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.campaign.findUnique({
        where: { id: input.id, workspaceId: ctx.workspace.id },
        include: {
          segment: true,
          sends: {
            include: { subscriber: true },
            take: 50,
          },
        },
      });
    }),

  create: creatorProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        htmlContent: z.string().min(1),
        segmentId: z.string().optional(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.campaign.create({
        data: {
          workspaceId: ctx.workspace.id,
          ...input,
          status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
        },
      });
    }),

  update: creatorProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        subject: z.string().optional(),
        htmlContent: z.string().optional(),
        status: z.nativeEnum(CampaignStatus).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaign.update({
        where: { id, workspaceId: ctx.workspace.id },
        data,
      });
    }),

  getStats: creatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id, workspaceId: ctx.workspace.id },
      });

      if (!campaign) return null;

      const [sent, opened, clicked, bounced] = await Promise.all([
        ctx.db.campaignSend.count({
          where: { campaignId: input.id, status: "SENT" },
        }),
        ctx.db.campaignSend.count({
          where: { campaignId: input.id, status: "OPENED" },
        }),
        ctx.db.campaignSend.count({
          where: { campaignId: input.id, status: "CLICKED" },
        }),
        ctx.db.campaignSend.count({
          where: { campaignId: input.id, status: "BOUNCED" },
        }),
      ]);

      return { sent, opened, clicked, bounced };
    }),
});