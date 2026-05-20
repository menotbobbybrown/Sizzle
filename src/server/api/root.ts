import { exampleRouter } from "@/server/api/routers/example";
import { tenantRouter } from "@/server/api/routers/tenant";
import { billingRouter } from "@/server/api/routers/billing";
import { productRouter } from "@/server/api/routers/product";
import { storefrontRouter } from "@/server/api/routers/storefront";
import { checkoutRouter } from "@/server/api/routers/checkout";
import { courseRouter } from "@/server/api/routers/course";
import { userRouter } from "@/server/api/routers/user";
import { createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  tenant: tenantRouter,
  billing: billingRouter,
  product: productRouter,
  storefront: storefrontRouter,
  checkout: checkoutRouter,
  course: courseRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
