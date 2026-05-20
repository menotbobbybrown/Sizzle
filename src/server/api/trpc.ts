import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getWorkspaceEntitlements } from "@/lib/entitlements";

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  const session = await auth();

  // Resolve workspace from header or first workspace for logged-in users
  let workspace = null;
  let entitlements = null;

  // Try to get workspace from header (for public storefront routes)
  const workspaceHandle = opts.req.headers.get("x-workspace-handle");
  if (workspaceHandle) {
    workspace = await db.workspace.findUnique({
      where: { handle: workspaceHandle },
    });
  }

  // If no workspace from header, get the user's first workspace
  if (!workspace && session?.user?.id) {
    const membership = await db.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    workspace = membership?.workspace ?? null;
  }

  if (workspace) {
    entitlements = getWorkspaceEntitlements(workspace);
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

/**
 * Creator procedure - requires user to be owner/admin of workspace
 * Workspace must be resolved in context (from header or first workspace)
 */
export const creatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.workspace) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workspace not found. Please provide a workspace handle.",
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
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this workspace" });
  }

  return next({
    ctx: {
      ...ctx,
      workspace: ctx.workspace,
      membership,
    },
  });
});

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});