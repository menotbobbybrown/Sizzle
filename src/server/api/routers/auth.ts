import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type OnboardingStep } from "@prisma/client";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { isReservedHandle } from "@/config/route-map";

export const authRouter = createTRPCRouter({
  /**
   * Sign up - create user account
   * In NextAuth v5, we rely on the auth() session. This is for additional checks.
   */
  signup: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          email: input.email ?? ctx.session.user.email,
        },
      });

      // Initialize onboarding state
      await ctx.db.onboardingState.create({
        data: {
          userId: user.id,
          step: "ACCOUNT",
        },
      });

      return { success: true, user };
    }),

  /**
   * Check if a handle is available
   */
  checkHandle: publicProcedure
    .input(z.object({ handle: z.string().min(2).max(50) }))
    .query(async ({ ctx, input }) => {
      const handle = input.handle.toLowerCase();

      // Validate format
      const handleRegex = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;
      if (!handleRegex.test(handle)) {
        return { available: false, reason: "Invalid handle format. Use lowercase letters, numbers, and hyphens." };
      }

      // Check reserved
      if (isReservedHandle(handle)) {
        return { available: false, reason: "This handle is reserved." };
      }

      // Check existing
      const existing = await ctx.db.workspace.findUnique({
        where: { handle },
      });
      if (existing) {
        return { available: false, reason: "This handle is already taken." };
      }

      const reservation = await ctx.db.handleReservation.findUnique({
        where: { handle },
      });
      if (reservation && reservation.userId !== ctx.session?.user?.id) {
        return { available: false, reason: "This handle is already claimed." };
      }

      return { available: true };
    }),

  /**
   * Reserve a handle temporarily (during onboarding)
   */
  reserveHandle: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const handle = input.handle.toLowerCase();

      // Validate format
      const handleRegex = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;
      if (!handleRegex.test(handle)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid handle format." });
      }

      // Check reserved
      if (isReservedHandle(handle)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This handle is reserved." });
      }

      // Check existing workspace
      const existing = await ctx.db.workspace.findUnique({
        where: { handle },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Handle already taken." });
      }

      // Create or update reservation
      const reservation = await ctx.db.handleReservation.upsert({
        where: { handle },
        update: { workspaceId: null },
        create: {
          handle,
          userId: ctx.session.user.id,
        },
      });

      // Update onboarding step
      await ctx.db.onboardingState.update({
        where: { userId: ctx.session.user.id },
        data: { step: "HANDLE", handleSkipped: false },
      });

      return { success: true, reservation };
    }),

  /**
   * Get current user info
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        onboarding: true,
        workspaces: {
          include: {
            workspace: {
              include: {
                products: { where: { status: "PUBLISHED" } },
                storefront: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  /**
   * Get onboarding progress
   */
  getOnboarding: protectedProcedure.query(async ({ ctx }) => {
    let onboarding = await ctx.db.onboardingState.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!onboarding) {
      // Create if doesn't exist
      onboarding = await ctx.db.onboardingState.create({
        data: {
          userId: ctx.session.user.id,
          step: "ACCOUNT",
        },
      });
    }

    return onboarding;
  }),

  /**
   * Complete onboarding step
   */
  completeOnboardingStep: protectedProcedure
    .input(z.object({ step: z.enum(["ACCOUNT", "HANDLE", "PAYOUT", "BRANDING"]) }))
    .mutation(async ({ ctx, input }) => {
      const onboarding = await ctx.db.onboardingState.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!onboarding) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Onboarding not found" });
      }

      // Update the skip flag for this step
      const updateData: Record<string, boolean> = {};
      switch (input.step) {
        case "ACCOUNT":
          updateData.accountSkipped = true;
          break;
        case "HANDLE":
          updateData.handleSkipped = true;
          break;
        case "PAYOUT":
          updateData.payoutSkipped = true;
          break;
        case "BRANDING":
          updateData.brandingSkipped = true;
          break;
      }

      // Determine next step
      const stepOrder = ["ACCOUNT", "HANDLE", "PAYOUT", "BRANDING"] as const;
      type FlowStep = (typeof stepOrder)[number];
      const currentIndex = stepOrder.indexOf(onboarding.step as FlowStep);
      // `.at()` returns `FlowStep | undefined`, so the `?? "COMPLETED"` fallback
      // is reachable in the type — otherwise TS narrows away "COMPLETED".
      const nextStep: OnboardingStep = stepOrder.at(currentIndex + 1) ?? "COMPLETED";

      const updated = await ctx.db.onboardingState.update({
        where: { userId: ctx.session.user.id },
        data: {
          ...updateData,
          step: nextStep,
          completedAt: nextStep === "COMPLETED" ? new Date() : undefined,
        },
      });

      return updated;
    }),
});