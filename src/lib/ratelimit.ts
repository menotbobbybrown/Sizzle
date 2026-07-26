import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { NextResponse } from "next/server";

// Create Redis client (optional - rate limiting is a no-op if not configured)
const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/** A limiter is `null` when Upstash Redis is not configured. */
export type MaybeLimiter = Ratelimit | null;

/**
 * Build a rate limiter, or `null` if Redis isn't configured. Returning `null`
 * (rather than throwing) lets the app run without Upstash in local/dev while
 * still enforcing limits wherever Redis is present. Response headers are set
 * explicitly by {@link checkRateLimit}.
 */
function createLimiter(
  prefix: string,
  limiter: ReturnType<typeof Ratelimit.slidingWindow>
): MaybeLimiter {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    analytics: true,
    prefix,
    limiter,
    ephemeralCache: new Map(),
  });
}

// ============================================================
// RATE LIMITERS
// ============================================================

// Checkout: 10/minute per IP
export const checkoutLimiter = createLimiter(
  "ratelimit:checkout",
  Ratelimit.slidingWindow(10, "1 m")
);

// Auth: 5/minute per IP
export const authLimiter = createLimiter(
  "ratelimit:auth",
  Ratelimit.slidingWindow(5, "1 m")
);

// AI Generation: 20/hour per workspace (or fallback to IP)
export const aiLimiter = createLimiter(
  "ratelimit:ai",
  Ratelimit.slidingWindow(20, "1 h")
);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export interface RateLimitConfig {
  identifier: string;
  limit?: number;
  window?: string;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || 
             request.headers.get("x-real-ip") || 
             "127.0.0.1";
  return ip;
}

/**
 * Check rate limit and return response
 */
export async function checkRateLimit(
  limiter: MaybeLimiter,
  identifier: string,
  options?: { metadata?: Record<string, string> }
): Promise<Response | null> {
  // No limiter configured → allow the request through.
  if (!limiter) return null;

  const { success, remaining, reset, limit } = await limiter.limit(
    identifier,
    options?.metadata
  );
  
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter,
        limit,
        remaining: 0,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }
  
  return null; // No rate limit exceeded
}

/**
 * Wrapper for API routes with rate limiting
 */
export function withRateLimit<T extends Request>(
  handler: (request: T) => Promise<Response>,
  limiter: MaybeLimiter,
  getIdentifier: (request: T) => string
) {
  return async (request: T): Promise<Response> => {
    const identifier = getIdentifier(request);
    const rateLimitResponse = await checkRateLimit(limiter, identifier);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    return handler(request);
  };
}