export const SAAS_PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    features: ["Up to 3 products", "5% transaction fee", "Basic analytics"],
    limits: {
      products: 3,
      transactionFee: 0.05,
    },
  },
  BASIC: {
    id: "basic",
    name: "Basic",
    price: 29,
    features: ["Unlimited products", "3% transaction fee", "Custom domain", "Email support"],
    limits: {
      products: Infinity,
      transactionFee: 0.03,
    },
  },
  PRO: {
    id: "pro",
    name: "Pro",
    price: 99,
    features: ["Unlimited products", "0% transaction fee", "Priority support", "Advanced analytics", "White-labeling"],
    limits: {
      products: Infinity,
      transactionFee: 0.0,
    },
  },
} as const;

export type SaaSPlanId = keyof typeof SAAS_PLANS;
