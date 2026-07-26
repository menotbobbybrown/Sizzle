import * as Sentry from "@sentry/nextjs";

/**
 * Server + edge Sentry initialization. No-op unless `SENTRY_DSN` is set, so the
 * app runs identically with monitoring off (local/dev/CI) and on (production).
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn,
      // Tune down in production if event volume/cost is a concern.
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    });
  }
}

// Forward App Router server errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
