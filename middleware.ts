import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RESERVED_HANDLES } from "@/config/route-map";

/**
 * Middleware handles:
 * 1. /<at>handle → /store/[handle] rewrites (creator storefronts)
 * 2. Reserved handle collision protection
 * 3. Handle validation (alphanumeric + hyphens, no @ prefix in DB)
 * 4. Affiliate ref= query param capture → sizzle_ref cookie
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── Affiliate ref capture ────────────────────────────────────────
  // If query param ref exists and passes basic validation, set cookie
  const ref = searchParams.get("ref");
  let response: NextResponse | null = null;

  if (ref && typeof ref === "string" && ref.length >= 1 && ref.length <= 100) {
    // Validate: alphanumeric, hyphens, underscores only
    const refClean = ref.trim();
    if (/^[a-zA-Z0-9_-]+$/.test(refClean)) {
      // We need to set a cookie; create a response early if we know we're not rewriting
      response = NextResponse.next();
      response.cookies.set("sizzle_ref", refClean, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  // ── Handle rewrites ──────────────────────────────────────────────
  // Only process single-segment paths (potential handles)
  const segments = pathname.split("/").filter(Boolean);

  // Must be exactly one segment (e.g. /handle, not /handle/foo/bar)
  // Must not start with an underscore (reserved for Next.js internals)
  // Must not be an API route or known app route
  if (segments.length !== 1) {
    return response ?? NextResponse.next();
  }

  const potentialHandle = segments[0]!.toLowerCase();

  // Skip if it's a reserved route or starts with special chars
  if (
    potentialHandle.startsWith("_") ||
    potentialHandle.startsWith(".") ||
    RESERVED_HANDLES.includes(potentialHandle as any)
  ) {
    return response ?? NextResponse.next();
  }

  // Validate handle format: alphanumeric, hyphens allowed
  const handleRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  if (!handleRegex.test(potentialHandle)) {
    return response ?? NextResponse.next();
  }

  // Rewrite to internal store route
  const url = request.nextUrl.clone();
  url.pathname = `/store/${potentialHandle}`;
  url.searchParams.set("__handle", potentialHandle);

  const rewriteResponse = NextResponse.rewrite(url);

  // If we already have a response with cookie set, merge cookie into rewrite
  if (response) {
    const cookieValue = response.cookies.get("sizzle_ref")?.value;
    if (cookieValue) {
      rewriteResponse.cookies.set("sizzle_ref", cookieValue, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  return rewriteResponse;
}

export const config = {
  // Match all paths except static files, api routes, Next.js internals
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\.).*)",
  ],
};