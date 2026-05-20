/**
 * Pricing Configuration
 * 
 * Supports two modes:
 * - "single" (default): Flat $5/month "everything included" (Phase 1)
 * - "tiered": Three-tier pricing ($29/$79/$149) for later phases
 * 
 * Toggle between modes using PRICING_MODE env variable.
 */

export type PricingMode = "single" | "tiered";

// Get the current pricing mode from env (default to "single" for Phase 1)
const PRICING_MODE = (process.env.PRICING_MODE ?? "single") as PricingMode;

/**
 * Single Plan ($5/month - Phase 1 default)
 * Everything included, one simple price.
 */
export const SINGLE_PRICING = {
  price: 500, // $5.00 in cents
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

/**
 * Tiered Plans (for future phases)
 */
export const TIERED_PRICING = {
  tiers: [
    {
      id: "starter",
      name: "Starter",
      price: 2900, // $29 in cents
      displayPrice: "$29",
      interval: "month" as const,
      description: "Perfect for getting started",
      features: [
        "Up to 5 products",
        "2% transaction fee",
        "Email support",
        "Basic analytics",
        "1,000 email subscribers",
      ],
      limitations: {
        maxProducts: 5,
        transactionFeePercent: 2,
        maxSubscribers: 1000,
        hasCustomDomain: false,
        hasAiTools: false,
        hasWhiteLabel: false,
      },
    },
    {
      id: "creator",
      name: "Creator",
      price: 7900, // $79 in cents
      displayPrice: "$79",
      interval: "month" as const,
      description: "For growing creators",
      features: [
        "Unlimited products",
        "0% transaction fees",
        "Custom domain",
        "Email marketing",
        "Basic AI tools",
        "Advanced analytics",
        "10,000 email subscribers",
        "Priority support",
      ],
      limitations: {
        maxProducts: Infinity,
        transactionFeePercent: 0,
        maxSubscribers: 10000,
        hasCustomDomain: true,
        hasAiTools: true,
        hasWhiteLabel: false,
      },
      popular: true,
    },
    {
      id: "pro",
      name: "Pro",
      price: 14900, // $149 in cents
      displayPrice: "$149",
      interval: "month" as const,
      description: "For established businesses",
      features: [
        "Everything in Creator",
        "Unlimited email subscribers",
        "White-label branding",
        "Advanced AI tools",
        "Dedicated support",
        "API access",
        "Custom integrations",
      ],
      limitations: {
        maxProducts: Infinity,
        transactionFeePercent: 0,
        maxSubscribers: Infinity,
        hasCustomDomain: true,
        hasAiTools: true,
        hasWhiteLabel: true,
      },
    },
  ],
  annualDiscount: 0.2, // 20% off for annual billing
} as const;

/**
 * Get the active pricing based on mode
 */
export function getActivePricing(): typeof SINGLE_PRICING | typeof TIERED_PRICING {
  if (PRICING_MODE === "tiered") {
    return TIERED_PRICING;
  }
  return SINGLE_PRICING;
}

/**
 * Get plan entitlements based on pricing mode
 */
export function getPlanEntitlements(plan?: "starter" | "creator" | "pro") {
  if (PRICING_MODE === "tiered" && plan) {
    const tier = TIERED_PRICING.tiers.find((t) => t.id === plan);
    return tier?.limitations ?? {
      maxProducts: 0,
      transactionFeePercent: 100,
      maxSubscribers: 0,
      hasCustomDomain: false,
      hasAiTools: false,
      hasWhiteLabel: false,
    };
  }

  // Single plan - everything included
  return {
    maxProducts: Infinity,
    transactionFeePercent: 0,
    maxSubscribers: Infinity,
    hasCustomDomain: true,
    hasAiTools: true,
    hasWhiteLabel: true,
  };
}

export type Entitlements = ReturnType<typeof getPlanEntitlements>;

// Export for convenience - defaults to single pricing
export const PRICING = SINGLE_PRICING;