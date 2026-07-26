# Production Readiness — Changes

This document records the fixes applied to make Sizzle build, typecheck, test, and
run correctly. Verification gates now all pass:

- `npx tsc --noEmit` — 0 errors
- `npx vitest run` — 26 tests pass
- `npx next build` — succeeds

## Tier 1 — Hard blockers (nothing built before these)

- **`src/server/api/trpc.ts` was truncated mid-function.** `adminProcedure` was cut
  off with no body; the entire tRPC layer failed to compile. Completed it with a
  real `FORBIDDEN`-on-non-admin check.
- **`src/inngest/functions/post-purchase.ts` was truncated** — the `inngestFunctions`
  array was never closed. Closed it.
- **Corrupted files.** `src/env.ts`, `src/server/api/routers/product.ts`, and
  `.gitignore` had shell error text appended to them on disk. Stripped the garbage.
- **Missing dependencies.** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
  (used by `src/lib/r2.ts`) were not in `package.json`. Added them, plus `vitest`
  and a `test` script.
- **Prisma had no usable migration history.** The only migration was empty and there
  was no baseline or `migration_lock.toml`, so `migrate deploy` created zero tables.
  Generated a full baseline migration (`prisma/migrations/0_init`) from the schema
  and added the lock file.
- **Prisma 7 driver adapter.** Prisma 7's default engine requires a driver adapter.
  Installed `@prisma/adapter-pg` + `pg` and wired the adapter into `src/lib/db.ts`
  and `prisma/seed.ts`. Connection URLs live in `prisma.config.ts` (Prisma 7 style).

## Tier 2 — Payment & security

- **Buyers received dead access links.** The receipt email built its access URL from
  an `accessToken` that was never in the event payload, so every "Access your
  purchase" link 404'd. The raw token is now generated in the fulfillment step and
  threaded to the email step.
- **Refunds are real.** `order.refund` now calls `stripe.refunds.create` with
  `reverse_transfer` + `refund_application_fee`, then revokes access tokens. It was
  previously a DB-only stub that never returned money.
- **Admin console is gated.** `src/app/admin/layout.tsx` now enforces an `ADMIN` role
  server-side; non-admins are redirected.
- **Dashboard is gated.** `src/app/dashboard/layout.tsx` now requires a session, so
  every dashboard page is protected by construction. `middleware.ts` also adds a
  fast cookie-based redirect for `/dashboard`, `/admin`, `/onboarding`.
- **One Stripe webhook endpoint.** Removed the dead `/api/stripe/webhook` route that
  queried a non-existent compound key and would 500 on every event. `/api/webhooks/
  stripe` is canonical.
- **Platform fee.** Both checkout paths now set Stripe `application_fee_amount` based
  on the seller's plan (free tier 5%, paid tiers 0%), per `src/config/pricing.ts`.
- **Connect readiness.** The Connect callback now checks `charges_enabled` /
  `details_submitted` before marking an account `connected`; checkout requires the
  `connected` status, not just the presence of an account id.
- **Storefront "Buy now" works.** The REST checkout route now parses form-encoded
  bodies and 303-redirects native form posts (it previously called `req.json()` and
  returned JSON to an HTML form).
- **Webhook idempotency.** `handleCheckoutCompleted` short-circuits if the order
  already exists, instead of throwing on the unique constraint and triggering
  endless Stripe retries.

## Tier 3 — Implemented stubbed features

- **`lesson` router** — full CRUD with workspace-ownership checks, plus student
  `markComplete` (idempotent progress, recomputed `progressPercent`, fires
  `COURSE_COMPLETED` once) and `getProgress`.
- **`module` router** — full CRUD + `reorder` (transactional, ownership-checked).
- **`review` router** — `create` with purchase verification and one-per-user, and
  `moderate` scoped to the creator's own products.
- **`download.getDownloadUrl`** — returns a real R2 presigned URL (or course
  enrollment URL) with an atomic use-consume, instead of a placeholder.
- **`order.resendDelivery`** — mints fresh single-use links and actually emails them.
- **`/signup` page** and **`/api/sitemap`** route added (the latter was referenced by
  `next.config.ts` but missing).

## Framework-version fixes (pre-existing, ~76 typecheck errors)

- **Inngest v4** — `createFunction` moved the trigger into the options object
  (`triggers: [...]`); updated all seven functions.
- **Next 16** — `revalidateTag(tag)` now requires a cache profile; added a
  `src/lib/revalidate.ts` compat wrapper and repointed call sites.
- **Zod v4** — `z.record(value)` → `z.record(key, value)`.
- **lucide-react** dropped brand icons (Instagram/YouTube); aliased to generic marks.
- **@upstash/ratelimit v2** — limiters degrade to no-ops when Redis is unconfigured,
  in a type-safe way.
- Various: `WorkspaceMember.createdAt` added, `MuxAsset.metadata` added, onboarding
  step typing, campaign open/click counts sourced from `EmailEvent`, checkout context
  `req.headers`, invalid `GONE` tRPC codes replaced.

## Correctness nits

- **Encryption key** is now derived via SHA-256 (always 32 bytes), fixing the broken
  dev key and byte-length issues.
- **Seed** no longer double-encodes the `topProducts` JSON column.
- Consolidated the duplicate NextAuth config (`src/server/auth.ts` re-exports
  `src/lib/auth.ts`).

## Known non-blocking items

- `npm run lint` reports pre-existing `@typescript-eslint/no-explicit-any` on external
  payloads (Stripe/webhook/JSON). These do not affect the build (Next 16 does not lint
  on build) and are a separate typing-quality pass.
- `@sentry/nextjs` and `posthog-js` are dependencies but not yet initialized; wire them
  up (DSN/key + config) if you want error monitoring / product analytics.
- `.env` in the project root contains **placeholder** values used only to verify the
  build locally. Replace with real secrets (see `.env.example`).
