import Stripe from "stripe";
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