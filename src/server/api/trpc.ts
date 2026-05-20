import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getWorkspaceEntitlements } from "@/lib/entitlements";

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  const session = await auth();

  // Resolve workspace from header or handle
  const workspaceHandle = opts.req.headers.get("x-workspace-handle");

  let workspace = null;
  let entitlements = null;
  if (workspaceHandle) {
    workspace = await db.workspace.findUnique({
      where: { handle: workspaceHandle },
    });
    if (workspace) {
      entitlements = getWorkspaceEntitlements(workspace);
    }
  }

  return {
    db,
    session,
    workspace,
    entitlements,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const creatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.workspace) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workspace not found or not provided",
    });
  }

  const membership = await ctx.db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: ctx.workspace.id,
        userId: ctx.session.user.id,
      },
    },
  });

  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "ADMIN")
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({
    ctx: {
      workspace: ctx.workspace,
      membership,
    },
  });
});