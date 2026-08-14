# Native Sizzle Dashboard TODO

- [x] Inspect existing native dashboard routes, shared components, and live Sizzle tRPC procedures.
- [x] Replace placeholder dashboard overview and analytics placeholders with live workspace metrics, orders, product, subscriber, and analytics data.
- [x] Build native product and order management views using the existing authenticated creator procedures.
- [x] Use the existing NextAuth session and workspace membership model for every protected dashboard workflow.
- [ ] Ensure desktop and mobile dashboard layouts have no overlap, clipping, horizontal overflow, or accidental underlines through live authenticated verification.
- [x] Add or extend native Sizzle tests for dashboard data and mutation workflows.
- [ ] Run live authenticated responsive verification with the configured Sizzle runtime.
- [x] Include the active workspace handle in product management data so storefront links resolve to the real product route.
- [x] Add a mobile-safe native dashboard navigation menu so every backend-connected dashboard workflow remains reachable on small screens.
- [x] Accept Prisma Decimal values in live product-price formatting and ensure the associated helper test runs in the native test suite.
- [ ] Audit local environment configuration and remaining native dashboard placeholders without relying on a production deployment.
- [x] Complete additional workspace data views that can run through the repository’s own NextAuth, Prisma, and tRPC stack.
- [x] Prepare a safe local environment template and repeatable verification path for the native Sizzle application.
- [x] Replace the workspace settings placeholder with a creator-scoped save form backed by the existing tenant procedures.
