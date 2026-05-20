import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RESERVED_HANDLES } from "@/config/route-map";

/**
 * Middleware handles:
 * 1. /<at>handle → /store/[handle] rewrites (creator storefronts)
 * 2. Reserved handle collision protection
 * 3. Handle validation (alphanumeric + hyphens, no @ prefix in DB)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process single-segment paths (potential handles)
  const segments = pathname.split("/").filter(Boolean);

  // Must be exactly one segment (e.g. /handle, not /handle/foo/bar)
  // Must not start with an underscore (reserved for Next.js internals)
  // Must not be an API route or known app route
  if (segments.length !== 1) {
    return NextResponse.next();
  }

  const potentialHandle = segments[0]!.toLowerCase();

  // Skip if it's a reserved route or starts with special chars
  if (
    potentialHandle.startsWith("_") ||
    potentialHandle.startsWith(".") ||
    RESERVED_HANDLES.includes(potentialHandle as any)
  ) {
    return NextResponse.next();
  }

  // Validate handle format: alphanumeric, hyphens allowed
  const handleRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  if (!handleRegex.test(potentialHandle)) {
    return NextResponse.next();
  }

  // Rewrite to internal store route
  // The @ prefix is implied by the URL pattern (e.g. /myhandle → @myhandle)
  const url = request.nextUrl.clone();
  url.pathname = `/store/${potentialHandle}`;
  url.searchParams.set("__handle", potentialHandle);

  return NextResponse.rewrite(url);
}

export const config = {
  // Match all paths except static files, api routes, Next.js internals
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\.).*)",
  ],
};
