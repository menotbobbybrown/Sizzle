import { describe, expect, it } from "vitest";
import { normalizeProductSlug, productPriceLabel } from "../src/lib/product-form";

describe("product form helpers", () => {
  it("normalizes names to backend-valid URL slugs", () => {
    expect(normalizeProductSlug("  Creator's  Guide 2026! ")).toBe("creator-s-guide-2026");
    expect(normalizeProductSlug("---Already-valid---")).toBe("already-valid");
  });

  it("formats product amounts including Prisma Decimal-compatible values", () => {
    expect(productPriceLabel("29.5")).toBe("$29.50");
    expect(productPriceLabel({ toString: () => "12" })).toBe("$12.00");
  });
});
