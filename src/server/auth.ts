/**
 * Canonical NextAuth surface.
 *
 * The single source of truth lives in `@/lib/auth`. Historically this file held
 * a byte-for-byte duplicate of that config, which meant two `NextAuth()`
 * initializations and two `declare module` augmentations that could silently
 * drift apart. We keep this path as a thin re-export so existing imports
 * (`@/server/auth`) stay valid while there is exactly one config in the tree.
 */
export { handlers, auth, signIn, signOut } from "@/lib/auth";
