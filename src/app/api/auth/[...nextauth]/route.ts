import { authLimiter, getClientIP, checkRateLimit } from "@/lib/ratelimit";
import { handlers } from "@/server/auth";
import { NextRequest } from "next/server";

// Wrap the POST handler with rate limiting
const originalHandlers = handlers;

export const GET = originalHandlers.GET;
export const POST = async (req: NextRequest) => {
  // Apply rate limiting for auth endpoints
  const ip = getClientIP(req);
  const rateLimitResponse = await checkRateLimit(authLimiter, ip);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  return originalHandlers.POST(req);
};