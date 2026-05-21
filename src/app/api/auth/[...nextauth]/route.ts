import { handlers } from "@/server/auth";
import { authLimiter, checkRateLimit } from "@/lib/ratelimit";
import { type NextRequest, NextResponse } from "next/server";

const { GET: authGet, POST: authPost } = handlers;

export async function GET(req: NextRequest) {
  return authGet(req);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await checkRateLimit(authLimiter, ip);
  
  if (!success) {
    return new NextResponse("Too many requests", { status: 429 });
  }
  
  return authPost(req);
}
