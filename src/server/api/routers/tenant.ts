import { z } from "zod";
import { createTRPCRouter, protectedProcedure, creatorProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { isReservedHandle } from "@/config/route-map";
import { revalidateTag } from "next/cache";
import { cache } from "@/lib/cache";

export const tenantRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      handle: z.string().min(2).regex(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
    }))
    .mutation(async ({ ctx, input }) => {
      if (isReservedHandle(input.handle)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This handle is reserved",
        });
      }

      const existing = await ctx.db.workspace.findUnique({
        where: { handle: input.handle },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Handle already taken",
        });
      }

      return ctx.db.workspace.create({
        data: {
          name: input.name,
          handle: input.handle,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "OWNER",
            },
          },
        },
      });
    }),

  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.workspace.findMany({
      where: {
        members: {
          some: {
            userId: ctx.session.user.id,
          },
        },
      },
    });
  }),

  getByHandle: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.workspace.findUnique({
        where: { handle: input.handle },
        include: {
          products: {
            where: { status: "PUBLISHED" },
          },
        },
      });
    }),

  getCurrent: creatorProcedure.query(({ ctx }) => {
    return ctx.db.workspace.findUnique({
      where: { id: ctx.workspace.id },
      include: {
        products: true,
        storefront: true,
        members: {
          include: { user: true },
        },
      },
    });
  }),

  update: creatorProcedure
    .input(z.object({
      name: z.string().optional(),
      logoUrl: z.string().url().optional(),
      bannerUrl: z.string().url().optional(),
      bio: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.workspace.update({
        where: { id: ctx.workspace.id },
        data: input,
      });
    }),

  updateDesign: creatorProcedure
    .input(z.object({ config: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.storefrontTheme.upsert({
        where: { workspaceId: ctx.workspace.id },
        update: {
          config: input.config as any,
          published: true,
        },
        create: {
          workspaceId: ctx.workspace.id,
          config: input.config as any,
          published: true,
        },
      });

      // Revalidate Next.js cache tag
      revalidateTag(`storefront-${ctx.workspace.handle}`);

      // Invalidate Redis storefront cache
      await cache.invalidateStorefront(ctx.workspace.handle);

      return { success: true };
    }),
});
