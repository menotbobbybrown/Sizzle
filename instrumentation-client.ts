import * as Sentry from "@sentry/nextjs";

// Client-side Sentry init. No-op unless a public DSN is configured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Capture a replay only when an error occurs, to keep volume low.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}
