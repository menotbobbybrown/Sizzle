"use client";

import {
  type StorefrontThemeConfig,
  fontClass,
  buttonRadiusClass,
} from "@/lib/storefront/theme";

type PreviewStore = {
  name: string;
  handle: string;
  bio?: string | null;
  logoUrl?: string | null;
};

const SAMPLE_PRODUCTS = [
  { name: "Starter Pack", price: "$19" },
  { name: "Pro Course", price: "$99" },
  { name: "1:1 Coaching", price: "$250" },
];

/**
 * Real-time, theme-accurate representation of the storefront. It renders from
 * the same `StorefrontThemeConfig` the public store uses (and the same style
 * helpers), so what a creator sees here matches what ships.
 */
export function StorefrontPreview({
  theme,
  store,
}: {
  theme: StorefrontThemeConfig;
  store: PreviewStore;
}) {
  const btn = buttonRadiusClass(theme.buttonStyle);
  const headline = theme.headline || store.name;
  const tagline = theme.tagline ?? store.bio ?? "";

  return (
    <div
      className={`h-full overflow-y-auto ${fontClass(theme.fontFamily)}`}
      style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
    >
      <div className="p-6">
        {theme.sections.showRecentSales && (
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: `${theme.accentColor}22`, color: theme.accentColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: theme.accentColor }}
            />
            Someone just bought {SAMPLE_PRODUCTS[0].name}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-white text-xl font-bold mb-3"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              headline.charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="text-xl font-bold">{headline}</h1>
          <p className="text-sm opacity-60">@{store.handle}</p>
          {theme.sections.showBio && tagline && (
            <p className="mt-2 text-sm opacity-80 max-w-xs">{tagline}</p>
          )}

          {theme.sections.showSocials && (
            <div className="flex gap-2 mt-3">
              {["IG", "YT", "TT"].map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{ borderColor: `${theme.textColor}22` }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Featured */}
        {theme.sections.showFeatured && (
          <div
            className="mt-6 rounded-2xl p-5 text-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: theme.accentColor }}
            >
              Featured
            </div>
            <div className="text-lg font-bold">{SAMPLE_PRODUCTS[1].name}</div>
            <div className="flex items-center justify-between mt-3">
              <span className="font-bold">{SAMPLE_PRODUCTS[1].price}</span>
              <span
                className={`text-xs font-bold px-3 py-1.5 ${btn}`}
                style={{ backgroundColor: theme.accentColor, color: "#111" }}
              >
                Buy now
              </span>
            </div>
          </div>
        )}

        {/* All products */}
        {theme.sections.showAllProducts && (
          <div className="mt-6">
            <div className="text-sm font-bold mb-3">All products</div>
            <div
              className={
                theme.layout === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"
              }
            >
              {SAMPLE_PRODUCTS.map((p) => (
                <div
                  key={p.name}
                  className={`border rounded-xl p-3 ${
                    theme.layout === "list" ? "flex items-center justify-between" : ""
                  }`}
                  style={{ borderColor: `${theme.textColor}18` }}
                >
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div
                    className={`${theme.layout === "grid" ? "mt-3 flex items-center justify-between" : "flex items-center gap-3"}`}
                  >
                    <span className="text-sm font-bold">{p.price}</span>
                    <span
                      className={`text-[11px] font-semibold px-3 py-1 text-white ${btn}`}
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Buy
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
