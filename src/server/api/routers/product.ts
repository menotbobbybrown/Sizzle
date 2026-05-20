import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, creatorProcedure } from "@/server/api/trpc";
import { ProductType, ProductStatus } from "@prisma/client";
import { isReservedHandle } from "@/config/route-map";
import { generatePresignedUrl, generateFileKey } from "@/lib/r2";

export const productRouter = createTRPCRouter({
  /**
   * List products for a workspace (public)
   */
  list: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findUnique({
        where: { handle: input.handle },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }

      return ctx.db.product.findMany({
        where: { workspaceId: workspace.id, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get product by slug (public)
   */
  getBySlug: publicProcedure
    .input(z.object({ handle: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: {
          slug: input.slug,
          workspace: { handle: input.handle },
          status: "PUBLISHED",
        },
        include: {
          workspace: {
            select: { name: true, handle: true, logoUrl: true },
          },
          course: {
            include: {
              modules: {
                include: { lessons: { orderBy: { order: "asc" } } },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return product;
    }),

  /**
   * List creator's own products (protected)
   */
  listMine: creatorProcedure.query(({ ctx }) => {
    return ctx.db.product.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { orderItems: true, enrollments: true } },
      },
    });
  }),

  /**
   * Create a new product
   */
  create: creatorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        description: z.string().max(2000).optional(),
        price: z.number().min(0),
        type: z.nativeEnum(ProductType),
        imageUrl: z.string().url().optional().nullable(),
        status: z.nativeEnum(ProductStatus).default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate slug format
      const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
      if (!slugRegex.test(input.slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Slug must be lowercase with hyphens, no leading/trailing hyphens",
        });
      }

      // Check for reserved handles in slug
      if (isReservedHandle(input.slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This slug is reserved",
        });
      }

      // Check for existing slug in workspace
      const existing = await ctx.db.product.findUnique({
        where: { workspaceId_slug: { workspaceId: ctx.workspace.id, slug: input.slug } },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A product with this slug already exists",
        });
      }

      const product = await ctx.db.product.create({
        data: {
          workspaceId: ctx.workspace.id,
          name: input.name,
          slug: input.slug,
          description: input.description,
          price: input.price,
          type: input.type,
          imageUrl: input.imageUrl,
          status: input.status,
        },
      });

      // If it's a course, create the course record
      if (input.type === "COURSE") {
        await ctx.db.course.create({
          data: { productId: product.id },
        });
      }

      return product;
    }),

  /**
   * Update a product
   */
  update: creatorProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional().nullable(),
        price: z.number().min(0).optional(),
        imageUrl: z.string().url().optional().nullable(),
        status: z.nativeEnum(ProductStatus).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const product = await ctx.db.product.findUnique({
        where: { id, workspaceId: ctx.workspace.id },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return ctx.db.product.update({
        where: { id },
        data,
      });
    }),

  /**
   * Toggle product active status
   */
  toggleActive: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.id, workspaceId: ctx.workspace.id },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const newStatus = product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

      return ctx.db.product.update({
        where: { id: input.id },
        data: { status: newStatus },
      });
    }),

  /**
   * Delete a product
   */
  delete: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.id, workspaceId: ctx.workspace.id },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      // Don't allow deleting products with orders
      const orderCount = await ctx.db.orderItem.count({
        where: { productId: input.id },
      });

      if (orderCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete a product with existing orders. Archive it instead.",
        });
      }

      await ctx.db.product.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get presigned upload URL for product image/file
   */
  getUploadUrl: creatorProcedure
    .input(
      z.object({
        productId: z.string(),
        filename: z.string(),
        contentType: z.string(),
        fileType: z.enum(["image", "file"]).default("image"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId, workspaceId: ctx.workspace.id },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const key = generateFileKey(
        ctx.workspace.id,
        input.productId,
        input.filename
      );

      const url = await generatePresignedUrl({
        key,
        contentType: input.contentType,
        action: "upload",
        expiresIn: 3600,
      });

      return { url, key };
    }),

  /**
   * Get product stats (for dashboard)
   */
  getStats: creatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.id, workspaceId: ctx.workspace.id },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const [orderItems, enrollments] = await Promise.all([
        ctx.db.orderItem.findMany({
          where: { productId: input.id },
          include: { order: { where: { status: { in: ["PAID", "FULFILLED"] } } } },
        }),
        ctx.db.enrollment.count({ where: { productId: input.id } }),
      ]);

      const revenue = orderItems
        .filter((oi) => oi.order.status === "PAID" || oi.order.status === "FULFILLED")
        .reduce((sum, oi) => sum + Number(oi.unitPrice) * oi.quantity, 0);

      return {
        productId: input.id,
        totalOrders: orderItems.length,
        totalRevenue: revenue,
        totalEnrollments: enrollments,
      };
    }),
});