/**
 * Flat $5/month pricing — everything included.
 * No tiered plans. One simple price.
 */

export const PRICING = {
  price: 500, // $5.00 in cents (Stripe uses cents)
  displayPrice: "$5",
  interval: "month" as const,
  name: "Sizzle Pro",
  description: "Everything you need to sell courses, digital products, and more.",
  features: [
    "Unlimited products & courses",
    "0% transaction fees",
    "Custom domain",
    "Built-in email marketing",
    "AI-powered content tools",
    "Advanced analytics",
    "Priority support",
    "White-label branding",
  ],
  trialDays: 14,
} as const;

export type PricingPlan = "pro";

export function getPlanEntitlements() {
  return {
    maxProducts: Infinity,
    transactionFee: 0,
    canUseCustomDomain: true,
    canRemoveBranding: true,
    hasEmailMarketing: true,
    hasAiTools: true,
    hasAdvancedAnalytics: true,
  };
}

export type Entitlements = ReturnType<typeof getPlanEntitlements>;