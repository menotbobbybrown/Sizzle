import Stripe from "stripe";
import { type WorkspacePlan } from "@prisma/client";
import { env } from "@/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27" as any,
  typescript: true,
});

export function stripeAmount(amount: number): number {
  return Math.round(amount * 100);
}

export function formatStripeAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Platform transaction fee, as a percentage, keyed by the seller's plan.
 *
 * Mirrors `transactionFeePercent` in `src/config/pricing.ts`: the free tier is
 * monetized through a per-sale fee, paid tiers take no cut. This is the platform's
 * revenue on marketplace sales and is applied as Stripe `application_fee_amount`
 * on the destination charge.
 */
const PLATFORM_FEE_PERCENT_BY_PLAN: Record<WorkspacePlan, number> = {
  FREE: 5,
  CREATOR: 0,
  PRO: 0,
  BUSINESS: 0,
  // A trial of a paid plan gets the paid-plan (zero) fee.
  TRIALING: 0,
  // Lapsed / cancelled subscriptions fall back to the free-tier fee.
  PAST_DUE: 5,
  CANCELED: 5,
};

export function getPlatformFeePercent(plan: WorkspacePlan): number {
  return PLATFORM_FEE_PERCENT_BY_PLAN[plan] ?? 5;
}

/**
 * Compute the platform's `application_fee_amount` (in cents) for a sale.
 * Returns 0 when the seller's plan takes no fee or the charge is $0, so callers
 * can safely omit the field when it is zero.
 */
export function computeApplicationFee(
  unitAmountCents: number,
  plan: WorkspacePlan
): number {
  const percent = getPlatformFeePercent(plan);
  if (percent <= 0 || unitAmountCents <= 0) return 0;
  return Math.round((unitAmountCents * percent) / 100);
}