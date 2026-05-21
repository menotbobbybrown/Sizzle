/**
 * Pricing Configuration
 * 
 * Three-tier pricing ($29/$79/$149)
 */

export const PRICING_TIERS = [
  {
    id: "creator",
    name: "Creator",
    price: 2900, // $29 in cents
    displayPrice: "$29",
    interval: "month" as const,
    description: "Perfect for getting started",
    features: [
      "Up to 10 products",
      "Unlimited courses",
      "Email support",
      "Basic analytics",
      "1,000 email subscribers",
    ],
    limitations: {
      maxProducts: 10,
      transactionFeePercent: 0,
      maxSubscribers: 1000,
      hasCustomDomain: false,
      hasAiTools: true,
      hasWhiteLabel: false,
    },
    trialDays: 14,
  },
  {
    id: "pro",
    name: "Pro",
    price: 7900, // $79 in cents
    displayPrice: "$79",
    interval: "month" as const,
    description: "For growing creators",
    features: [
      "Unlimited products",
      "Unlimited courses",
      "Custom domain",
      "Email marketing",
      "Advanced AI tools",
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
    trialDays: 14,
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 14900, // $149 in cents
    displayPrice: "$149",
    interval: "month" as const,
    description: "For established businesses",
    features: [
      "Everything in Pro",
      "Unlimited email subscribers",
      "White-label branding",
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
    trialDays: 14,
  },
] as const;

export const PRICING = {
  tiers: PRICING_TIERS,
  annualDiscount: 0.2, // 20% off for annual billing
};

/**
 * Get the active pricing
 */
export function getActivePricing() {
  return PRICING;
}

/**
 * Get plan entitlements
 */
export function getPlanEntitlements(plan?: "creator" | "pro" | "business") {
  if (plan) {
    const tier = PRICING_TIERS.find((t) => t.id === plan);
    if (tier) return tier.limitations;
  }

  // Default / Free entitlements
  return {
    maxProducts: 1,
    transactionFeePercent: 5,
    maxSubscribers: 100,
    hasCustomDomain: false,
    hasAiTools: false,
    hasWhiteLabel: false,
  };
}

export type Entitlements = ReturnType<typeof getPlanEntitlements>;
