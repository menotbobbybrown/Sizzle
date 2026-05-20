import { authRouter } from "@/server/api/routers/auth";
import { creatorRouter } from "@/server/api/routers/creator";
import { storefrontRouter } from "@/server/api/routers/storefront";
import { productRouter } from "@/server/api/routers/product";
import { moduleRouter } from "@/server/api/routers/module";
import { lessonRouter } from "@/server/api/routers/lesson";
import { checkoutRouter } from "@/server/api/routers/checkout";
import { orderRouter } from "@/server/api/routers/order";
import { downloadRouter } from "@/server/api/routers/download";
import { discountCodeRouter } from "@/server/api/routers/discountCode";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { subscriberRouter } from "@/server/api/routers/subscribers";
import { campaignRouter } from "@/server/api/routers/campaigns";
import { reviewRouter } from "@/server/api/routers/review";
import { aiRouter } from "@/server/api/routers/ai";
import { notificationRouter } from "@/server/api/routers/notification";
import { billingRouter } from "@/server/api/routers/billing";
import { tenantRouter } from "@/server/api/routers/tenant";
import { userRouter } from "@/server/api/routers/user";
import { exampleRouter } from "@/server/api/routers/example";
import { createTRPCRouter } from "@/server/api/trpc";

/**
 * Root API router
 *
 * All routers are registered here. Phase 1 procedures are fully implemented.
 * Non-Phase-1 procedures return NOT_IMPLEMENTED errors with TODO comments.
 */
export const appRouter = createTRPCRouter({
  // Auth & user management
  auth: authRouter,
  user: userRouter,
  tenant: tenantRouter,

  // Creator & storefront
  creator: creatorRouter,
  storefront: storefrontRouter,

  // Products & courses
  product: productRouter,
  module: moduleRouter,
  lesson: lessonRouter,

  // Checkout & orders
  checkout: checkoutRouter,
  order: orderRouter,

  // Downloads & access
  download: downloadRouter,

  // Discount codes
  discountCode: discountCodeRouter,

  // Analytics & billing
  analytics: analyticsRouter,
  billing: billingRouter,

  // Marketing
  subscriber: subscriberRouter,
  campaign: campaignRouter,
  review: reviewRouter,

  // AI & notifications
  ai: aiRouter,
  notification: notificationRouter,

  // Legacy/example
  example: exampleRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;