import { type Tenant, SaaSPlan } from "@prisma/client";
import { SAAS_PLANS } from "@/config/pricing";

export function getTenantEntitlements(tenant: Tenant) {
  const planConfig = SAAS_PLANS[tenant.plan as keyof typeof SAAS_PLANS] || SAAS_PLANS.FREE;
  
  return {
    maxProducts: planConfig.limits.products,
    transactionFee: planConfig.limits.transactionFee,
    canUseCustomDomain: tenant.plan !== "FREE",
    canRemoveBranding: tenant.plan === "PRO",
  };
}

export type Entitlements = ReturnType<typeof getTenantEntitlements>;
