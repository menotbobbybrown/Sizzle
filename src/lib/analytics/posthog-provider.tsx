"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { env } from "@/env";

let initialized = false;

function initPostHog() {
  if (initialized || !env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    // We capture pageviews manually on route change (App Router doesn't do
    // full page loads), so disable PostHog's automatic capture.
    capture_pageview: false,
    capture_pageleave: true,
  });
  initialized = true;
}

/** Fires a `$pageview` on every App Router navigation. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY || !pathname) return;
    const qs = searchParams?.toString();
    const url = `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Mounts PostHog product analytics. Renders children untouched and does nothing
 * at all when `NEXT_PUBLIC_POSTHOG_KEY` is unset, so it's safe everywhere.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      {/* useSearchParams must live under a Suspense boundary. */}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
