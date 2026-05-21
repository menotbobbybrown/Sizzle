import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";

export const affiliateRouter = createTRPCRouter({
  createLink: creatorProcedure
    .input(z.object({
      userId: z.string(),
      code: z.string(),
      commission: z.number(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.affiliateLink.create({
        data: {
          ...input,
          workspaceId: ctx.workspace.id,
        },
      });
    }),
    
  listLinks: creatorProcedure
    .query(({ ctx }) => {
      return ctx.db.affiliateLink.findMany({
        where: { workspaceId: ctx.workspace.id },
        include: { user: true, _count: { select: { orders: true } } },
      });
    }),

  toggleLink: creatorProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.affiliateLink.update({
        where: { id: input.id, workspaceId: ctx.workspace.id },
        data: { isActive: input.isActive },
      });
    }),

  getStats: creatorProcedure
    .query(async ({ ctx }) => {
      const links = await ctx.db.affiliateLink.findMany({
        where: { workspaceId: ctx.workspace.id },
        include: { orders: true },
      });

      return links.map(link => ({
        id: link.id,
        code: link.code,
        totalOrders: link.orders.length,
        totalRevenue: link.orders.reduce((acc, o) => acc + Number(o.amount), 0),
        totalCommission: link.orders.reduce((acc, o) => acc + Number(o.affiliateCommission || 0), 0),
      }));
    }),
});
