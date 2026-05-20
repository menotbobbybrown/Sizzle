/**
 * Canonical Route Map
 *
 * SOURCE OF TRUTH for all application routes.
 * Every route in the app must be declared here.
 *
 * Public routes (no auth required):
 *   / (marketing landing)
 *   /pricing
 *   /<at>handle  →  middleware rewrites to /store/[handle]
 *   /store/[handle]  (internal, not directly navigable)
 *   /store/[handle]/p/[slug]  (product detail)
 *   /login
 *   /api/*  (tRPC, Stripe webhooks, auth)
 *
 * Protected routes (auth required):
 *   /onboarding/*
 *   /dashboard/*
 *   /admin/*
 */

/** Reserved slugs that cannot be used as creator handles */
export const RESERVED_HANDLES = [
  "dashboard",
  "admin",
  "onboarding",
  "pricing",
  "login",
  "register",
  "api",
  "store",
  "app",
  "www",
  "support",
  "help",
  "docs",
  "blog",
  "status",
  "terms",
  "privacy",
  "about",
  "contact",
  "pricing",
  "features",
  "changelog",
  "mail",
  "email",
  "team",
  "legal",
  "settings",
  "profile",
  "account",
  "billing",
  "analytics",
  "design",
  "courses",
  "ai",
  "campaigns",
  "subscribers",
  "products",
  "orders",
  "integrations",
] as const;

export type ReservedHandle = (typeof RESERVED_HANDLES)[number];

export const ROUTES = {
  // Marketing
  HOME: "/",
  PRICING: "/pricing",

  // Auth
  LOGIN: "/login",

  // Onboarding
  ONBOARDING: "/onboarding",
  ONBOARDING_ACCOUNT: "/onboarding/account",
  ONBOARDING_HANDLE: "/onboarding/handle",
  ONBOARDING_PAYOUT: "/onboarding/payout",
  ONBOARDING_BRANDING: "/onboarding/branding",

  // Storefront (internal — accessed via /<at>handle rewrite)
  STORE: (handle: string) => `/store/${handle}`,
  STORE_PRODUCT: (handle: string, slug: string) => `/store/${handle}/p/${slug}`,

  // Dashboard
  DASHBOARD: "/dashboard",
  DASHBOARD_ANALYTICS: "/dashboard/analytics",
  DASHBOARD_PRODUCTS: "/dashboard/products",
  DASHBOARD_PRODUCT_NEW: "/dashboard/products/new",
  DASHBOARD_PRODUCT_EDIT: (id: string) => `/dashboard/products/${id}`,
  DASHBOARD_ORDERS: "/dashboard/orders",
  DASHBOARD_DESIGN: "/dashboard/design",
  DASHBOARD_COURSES: "/dashboard/courses",
  DASHBOARD_COURSE_BUILD: (id: string) => `/dashboard/courses/${id}`,
  DASHBOARD_AI: "/dashboard/ai",
  DASHBOARD_CAMPAIGNS: "/dashboard/campaigns",
  DASHBOARD_CAMPAIGN_NEW: "/dashboard/campaigns/new",
  DASHBOARD_CAMPAIGN_EDIT: (id: string) => `/dashboard/campaigns/${id}`,
  DASHBOARD_SUBSCRIBERS: "/dashboard/subscribers",
  DASHBOARD_BILLING: "/dashboard/billing",
  DASHBOARD_SETTINGS: "/dashboard/settings",

  // Admin
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_STORES: "/admin/stores",
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_DISPUTES: "/admin/disputes",
  ADMIN_WEBHOOKS: "/admin/webhooks",

  // API
  API_TRPC: "/api/trpc",
  API_AUTH: "/api/auth",
  API_STRIPE_CHECKOUT: "/api/stripe/checkout",
  API_STRIPE_WEBHOOK: "/api/stripe/webhook",
  API_ACCESS_TOKEN: (token: string) => `/api/access/${token}`,
  API_PUSHER_AUTH: "/api/pusher/auth",
  API_AI_GENERATE: "/api/ai/generate",
  API_CAMPAIGNS_SEND: "/api/campaigns/send",
  API_CAMPAIGNS_TRACK: "/api/campaigns/track",
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Check if a given string matches a reserved handle */
export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.includes(handle.toLowerCase() as ReservedHandle);
}