import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";
import { auth } from "@/server/auth";
import { getTenantEntitlements } from "@/lib/entitlements";

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  const session = await auth();

  // Resolve tenant from header or slug in URL if possible
  const tenantSlug = opts.req.headers.get("x-tenant-slug");
  
  let tenant = null;
  let entitlements = null;
  if (tenantSlug) {
    tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (tenant) {
      entitlements = getTenantEntitlements(tenant);
    }
  }

  return {
    db,
    session,
    tenant,
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
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const creatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.tenant) {
    throw new TRPCError({ 
      code: "NOT_FOUND", 
      message: "Tenant not found or not provided" 
    });
  }

  // Check if user is a member of this tenant with OWNER or ADMIN role
  const membership = await ctx.db.tenantMember.findUnique({
    where: {
      tenantId_userId: {
        tenantId: ctx.tenant.id,
        userId: ctx.session.user.id,
      },
    },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({
    ctx: {
      tenant: ctx.tenant,
      membership,
    },
  });
});
