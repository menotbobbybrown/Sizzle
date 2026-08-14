# Local Sizzle Dashboard Verification

The native dashboard now runs in the Sizzle application itself. Its protected pages use the repository’s **NextAuth session**, resolve the signed-in user’s first workspace membership, and execute the existing **Prisma** and **tRPC** workflows; they do not depend on the separate API-explorer project or a production URL.

| Requirement | Local value or action | Purpose |
|---|---|---|
| Node.js | Node 22 or a compatible Node 20 release | Runs Next.js and the native test suite. |
| PostgreSQL | A local PostgreSQL 14+ database | Stores users, workspaces, products, orders, analytics, campaigns, and subscribers. |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | Point both values at the local PostgreSQL database | Allows Prisma migrations and application queries. |
| `NEXTAUTH_SECRET` | Generate a distinct local secret | Signs local dashboard sessions. |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_URL` | `http://localhost:3000` | Keeps local callback and application URLs consistent. |
| Optional integrations | Leave blank during dashboard-only development | Stripe, R2, Resend, Inngest, social, and observability features are not required to exercise products, analytics, campaigns, or subscribers. |

Copy `.env.example` to `.env.local`, replace the database URL and `NEXTAUTH_SECRET`, then apply the existing schema using `npm run prisma:migrate`. Use `npm run prisma:seed` when a local example workspace is wanted. Finally, start `npm run dev` and sign in through the configured local NextAuth provider. The dashboard routes will redirect users without a workspace to onboarding, which is the repository’s intended authorization behavior.

Before using the dashboard, run `npm test` and `npm run typecheck`. The native validation suite covers the product form and subscriber import normalization in addition to the existing webhook and rate-limit tests.
