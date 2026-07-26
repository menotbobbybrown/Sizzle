/**
 * Canonical storefront theme model.
 *
 * This is the single source of truth for a storefront's look. The design editor
 * produces a `StorefrontThemeConfig`, it's persisted as JSON on
 * `StorefrontTheme.config`, and the public storefront reads it back through
 * `mergeTheme`. The style helpers below are shared by the editor's live preview
 * and the real storefront so the two can never drift.
 */

export type FontFamily = "sans" | "serif" | "mono";
export type ProductLayout = "grid" | "list";
export type ButtonStyle = "rounded" | "pill" | "square";

export type StorefrontSections = {
  showBio: boolean;
  showSocials: boolean;
  showFeatured: boolean;
  showAllProducts: boolean;
  showRecentSales: boolean;
};

export type StorefrontThemeConfig = {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: FontFamily;
  layout: ProductLayout;
  buttonStyle: ButtonStyle;
  sections: StorefrontSections;
  /** Optional overrides for the hero copy; fall back to workspace name/bio. */
  headline?: string;
  tagline?: string;
};

export const DEFAULT_THEME: StorefrontThemeConfig = {
  primaryColor: "#111111",
  accentColor: "#f59e0b",
  backgroundColor: "#ffffff",
  textColor: "#18181b",
  fontFamily: "sans",
  layout: "grid",
  buttonStyle: "rounded",
  sections: {
    showBio: true,
    showSocials: true,
    showFeatured: true,
    showAllProducts: true,
    showRecentSales: true,
  },
};

const FONTS: readonly FontFamily[] = ["sans", "serif", "mono"];
const LAYOUTS: readonly ProductLayout[] = ["grid", "list"];
const BUTTON_STYLES: readonly ButtonStyle[] = ["rounded", "pill", "square"];

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function color(value: unknown, fallback: string): string {
  // Accept #rgb / #rrggbb hex only; anything else falls back to the default.
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
    ? value
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Merge an untrusted, possibly-partial saved config over the defaults, coercing
 * every field to a valid value. Never throws — a malformed config yields the
 * default theme.
 */
export function mergeTheme(raw: unknown): StorefrontThemeConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const sections = (c.sections ?? {}) as Record<string, unknown>;

  return {
    primaryColor: color(c.primaryColor, DEFAULT_THEME.primaryColor),
    accentColor: color(c.accentColor, DEFAULT_THEME.accentColor),
    backgroundColor: color(c.backgroundColor, DEFAULT_THEME.backgroundColor),
    textColor: color(c.textColor, DEFAULT_THEME.textColor),
    fontFamily: pick(c.fontFamily, FONTS, DEFAULT_THEME.fontFamily),
    layout: pick(c.layout, LAYOUTS, DEFAULT_THEME.layout),
    buttonStyle: pick(c.buttonStyle, BUTTON_STYLES, DEFAULT_THEME.buttonStyle),
    sections: {
      showBio: bool(sections.showBio, DEFAULT_THEME.sections.showBio),
      showSocials: bool(sections.showSocials, DEFAULT_THEME.sections.showSocials),
      showFeatured: bool(sections.showFeatured, DEFAULT_THEME.sections.showFeatured),
      showAllProducts: bool(
        sections.showAllProducts,
        DEFAULT_THEME.sections.showAllProducts
      ),
      showRecentSales: bool(
        sections.showRecentSales,
        DEFAULT_THEME.sections.showRecentSales
      ),
    },
    headline: typeof c.headline === "string" ? c.headline : undefined,
    tagline: typeof c.tagline === "string" ? c.tagline : undefined,
  };
}

// ── Shared style mappings (editor preview + real storefront) ──────────────

export function fontClass(font: FontFamily): string {
  switch (font) {
    case "serif":
      return "font-serif";
    case "mono":
      return "font-mono";
    default:
      return "font-sans";
  }
}

export function buttonRadiusClass(style: ButtonStyle): string {
  switch (style) {
    case "pill":
      return "rounded-full";
    case "square":
      return "rounded-none";
    default:
      return "rounded-lg";
  }
}

/** CSS custom properties to hang the theme colors on a container. */
export function themeCssVars(theme: StorefrontThemeConfig): React.CSSProperties {
  return {
    ["--sf-primary" as string]: theme.primaryColor,
    ["--sf-accent" as string]: theme.accentColor,
    ["--sf-bg" as string]: theme.backgroundColor,
    ["--sf-text" as string]: theme.textColor,
  };
}
