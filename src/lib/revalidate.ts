import {
  revalidateTag as nextRevalidateTag,
  revalidatePath as nextRevalidatePath,
} from "next/cache";

/**
 * On-demand cache-tag purge.
 *
 * Next 16 changed `revalidateTag(tag)` to `revalidateTag(tag, profile)` where
 * the profile is a cache-life config. Passing `{ expire: 0 }` forces the tag's
 * entries to expire immediately, preserving the pre-16 "purge now" behavior.
 * This wrapper keeps every call site on the old one-argument ergonomics.
 */
export function revalidateTag(tag: string): void {
  nextRevalidateTag(tag, { expire: 0 });
}

/** Thin pass-through for symmetry with {@link revalidateTag}. */
export function revalidatePath(path: string, type?: "layout" | "page"): void {
  nextRevalidatePath(path, type);
}
