import { describe, it, expect, vi } from "vitest";

// `@/lib/stripe` instantiates the Stripe client from env at import time, so we
// provide a minimal, valid-looking env before importing it.
vi.mock("@/env", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test_123",
    NODE_ENV: "test",
  },
}));

import {
  computeApplicationFee,
  getPlatformFeePercent,
  stripeInterval,
} from "@/lib/stripe";
import { generateToken, hashToken } from "@/lib/tokens";

describe("Platform fee (destination-charge application fee)", () => {
  it("charges the free tier 5% and paid tiers nothing", () => {
    expect(getPlatformFeePercent("FREE")).toBe(5);
    expect(getPlatformFeePercent("CREATOR")).toBe(0);
    expect(getPlatformFeePercent("PRO")).toBe(0);
    expect(getPlatformFeePercent("BUSINESS")).toBe(0);
  });

  it("computes the fee in cents for a free-tier sale", () => {
    // $50.00 => 5000 cents, 5% => 250 cents
    expect(computeApplicationFee(5000, "FREE")).toBe(250);
  });

  it("returns 0 for paid tiers", () => {
    expect(computeApplicationFee(5000, "PRO")).toBe(0);
  });

  it("returns 0 for a zero-amount charge", () => {
    expect(computeApplicationFee(0, "FREE")).toBe(0);
  });

  it("rounds to the nearest cent", () => {
    // 999 cents * 5% = 49.95 => 50
    expect(computeApplicationFee(999, "FREE")).toBe(50);
  });

  it("treats lapsed subscriptions as free-tier and trials as paid", () => {
    expect(getPlatformFeePercent("PAST_DUE")).toBe(5);
    expect(getPlatformFeePercent("CANCELED")).toBe(5);
    expect(getPlatformFeePercent("TRIALING")).toBe(0);
  });
});

describe("Membership billing interval", () => {
  it("maps our interval enum to Stripe intervals", () => {
    expect(stripeInterval("DAY")).toBe("day");
    expect(stripeInterval("WEEK")).toBe("week");
    expect(stripeInterval("MONTH")).toBe("month");
    expect(stripeInterval("YEAR")).toBe("year");
  });
});

describe("Access tokens", () => {
  it("hashing is deterministic (so we can look up by hash)", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("never stores the raw token — the hash differs from the token", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toBe(token);
  });

  it("generates unique, high-entropy tokens", () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateToken()));
    expect(tokens.size).toBe(1000);
    // 32 random bytes hex-encoded => 64 chars
    expect(generateToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces a SHA-256 hex digest", () => {
    expect(hashToken("hello")).toMatch(/^[a-f0-9]{64}$/);
  });
});
