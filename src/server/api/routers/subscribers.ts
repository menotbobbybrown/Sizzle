import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { SubscriberStatus } from "@prisma/client";

export const subscriberRouter = createTRPCRouter({
  getAll: creatorProcedure.query(({ ctx }) => {
    return ctx.db.subscriber.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  getStats: creatorProcedure.query(async ({ ctx }) => {
    const [total, active, unsubscribed, bounced] = await Promise.all([
      ctx.db.subscriber.count({ where: { workspaceId: ctx.workspace.id } }),
      ctx.db.subscriber.count({
        where: { workspaceId: ctx.workspace.id, status: "ACTIVE" },
      }),
      ctx.db.subscriber.count({
        where: { workspaceId: ctx.workspace.id, status: "UNSUBSCRIBED" },
      }),
      ctx.db.subscriber.count({
        where: { workspaceId: ctx.workspace.id, status: "BOUNCED" },
      }),
    ]);

    return { total, active, unsubscribed, bounced };
  }),

  importSubscribers: creatorProcedure
    .input(
      z.object({
        subscribers: z.array(
          z.object({
            email: z.string().email(),
            name: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const sub of input.subscribers) {
        try {
          const created = await ctx.db.subscriber.upsert({
            where: {
              workspaceId_email: {
                workspaceId: ctx.workspace.id,
                email: sub.email,
              },
            },
            update: { name: sub.name ?? undefined },
            create: {
              workspaceId: ctx.workspace.id,
              email: sub.email,
              name: sub.name,
            },
          });
          results.push({ email: sub.email, status: "imported" });
        } catch (error) {
          results.push({ email: sub.email, status: "failed", error: String(error) });
        }
      }
      return results;
    }),

  unsubscribe: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.subscriber.update({
        where: { id: input.id, workspaceId: ctx.workspace.id },
        data: {
          status: "UNSUBSCRIBED",
          unsubscribedAt: new Date(),
        },
      });
    }),

  getSegments: creatorProcedure.query(({ ctx }) => {
    return ctx.db.segment.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { _count: { select: { campaigns: true } } },
    });
  }),

  createSegment: creatorProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        rules: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.segment.create({
        data: {
          workspaceId: ctx.workspace.id,
          name: input.name,
          description: input.description,
          rules: input.rules as object,
        },
      });
    }),
});