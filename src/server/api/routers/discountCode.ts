import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, creatorProcedure } from "@/server/api/trpc";

export const discountCodeRouter = createTRPCRouter({
  /**
   * Validate a discount code (public - for checkout)
   */
  validate: publicProcedure
    .input(z.object({ code: z.string(), productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const discount = await ctx.db.discountCode.findUnique({
        where: { code: input.code.toUpperCase() },
        include: { workspace: true },
      });

      if (!discount) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid discount code" });
      }

      if (!discount.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This discount code has been deactivated" });
      }

      // Check usage limit
      if (discount.maxUses && discount.usedCount >= discount.maxUses) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This discount code has reached its usage limit" });
      }

      // Check expiration
      if (discount.expiresAt && discount.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This discount code has expired" });
      }

      // Check start date
      if (discount.startsAt && discount.startsAt > new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This discount code is not yet active" });
      }

      // Get product to calculate discounted price
      const product = await ctx.db.product.findUnique({ where: { id: input.productId } });
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const originalPrice = Number(product.price);
      let discountAmount: number;
      let finalPrice: number;

      if (discount.type === "PERCENTAGE") {
        discountAmount = (originalPrice * Number(discount.value)) / 100;
        finalPrice = originalPrice - discountAmount;
      } else {
        discountAmount = Number(discount.value);
        finalPrice = Math.max(0, originalPrice - discountAmount);
      }

      return {
        code: discount.code,
        type: discount.type,
        value: Number(discount.value),
        discountAmount: Math.round(discountAmount * 100) / 100,
        originalPrice,
        finalPrice: Math.round(finalPrice * 100) / 100,
        currency: product.currency,
      };
    }),

  /**
   * List discount codes for creator's workspace
   */
  list: creatorProcedure
    .input(
      z
        .object({
          activeOnly: z.boolean().default(false),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { activeOnly = false, limit = 20 } = input ?? {};

      return ctx.db.discountCode.findMany({
        where: {
          workspaceId: ctx.workspace.id,
          ...(activeOnly ? { isActive: true } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }),

  /**
   * Create a new discount code
   */
  create: creatorProcedure
    .input(
      z.object({
        code: z.string().min(2).max(50).toUpperCase(),
        type: z.enum(["PERCENTAGE", "FIXED"]),
        value: z.number().positive(),
        maxUses: z.number().int().positive().optional(),
        startsAt: z.date().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if code already exists
      const existing = await ctx.db.discountCode.findUnique({
        where: { code: input.code },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This discount code already exists" });
      }

      return ctx.db.discountCode.create({
        data: {
          code: input.code,
          type: input.type,
          value: input.value,
          maxUses: input.maxUses,
          startsAt: input.startsAt,
          expiresAt: input.expiresAt,
          workspaceId: ctx.workspace.id,
        },
      });
    }),

  /**
   * Update a discount code
   */
  update: creatorProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean().optional(),
        maxUses: z.number().int().positive().optional().nullable(),
        expiresAt: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const discount = await ctx.db.discountCode.findUnique({
        where: { id },
      });

      if (!discount || discount.workspaceId !== ctx.workspace.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Discount code not found" });
      }

      return ctx.db.discountCode.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a discount code
   */
  delete: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const discount = await ctx.db.discountCode.findUnique({
        where: { id: input.id },
      });

      if (!discount || discount.workspaceId !== ctx.workspace.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Discount code not found" });
      }

      await ctx.db.discountCode.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});