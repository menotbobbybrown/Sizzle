"use client";

import {
  type StorefrontThemeConfig,
  type FontFamily,
  type ProductLayout,
  type ButtonStyle,
} from "@/lib/storefront/theme";

type DesignEditorProps = {
  value: StorefrontThemeConfig;
  onChange: (next: StorefrontThemeConfig) => void;
};

export function DesignEditor({ value, onChange }: DesignEditorProps) {
  const set = <K extends keyof StorefrontThemeConfig>(
    key: K,
    v: StorefrontThemeConfig[K]
  ) => onChange({ ...value, [key]: v });

  const setSection = (
    key: keyof StorefrontThemeConfig["sections"],
    v: boolean
  ) => onChange({ ...value, sections: { ...value.sections, [key]: v } });

  return (
    <div className="space-y-6">
      {/* Brand colors */}
      <Panel title="Brand">
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            label="Primary"
            value={value.primaryColor}
            onChange={(v) => set("primaryColor", v)}
          />
          <ColorField
            label="Accent"
            value={value.accentColor}
            onChange={(v) => set("accentColor", v)}
          />
          <ColorField
            label="Background"
            value={value.backgroundColor}
            onChange={(v) => set("backgroundColor", v)}
          />
          <ColorField
            label="Text"
            value={value.textColor}
            onChange={(v) => set("textColor", v)}
          />
        </div>
      </Panel>

      {/* Typography + shape */}
      <Panel title="Typography & Shape">
        <div className="grid grid-cols-2 gap-4">
          <SelectField<FontFamily>
            label="Font"
            value={value.fontFamily}
            onChange={(v) => set("fontFamily", v)}
            options={[
              { value: "sans", label: "Sans" },
              { value: "serif", label: "Serif" },
              { value: "mono", label: "Mono" },
            ]}
          />
          <SelectField<ButtonStyle>
            label="Buttons"
            value={value.buttonStyle}
            onChange={(v) => set("buttonStyle", v)}
            options={[
              { value: "rounded", label: "Rounded" },
              { value: "pill", label: "Pill" },
              { value: "square", label: "Square" },
            ]}
          />
          <SelectField<ProductLayout>
            label="Product layout"
            value={value.layout}
            onChange={(v) => set("layout", v)}
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
          />
        </div>
      </Panel>

      {/* Hero copy */}
      <Panel title="Hero">
        <div className="space-y-4">
          <TextField
            label="Headline"
            placeholder="Defaults to your store name"
            value={value.headline ?? ""}
            onChange={(v) => set("headline", v || undefined)}
          />
          <TextField
            label="Tagline"
            placeholder="Defaults to your bio"
            value={value.tagline ?? ""}
            onChange={(v) => set("tagline", v || undefined)}
          />
        </div>
      </Panel>

      {/* Section visibility */}
      <Panel title="Sections">
        <div className="space-y-2">
          <Toggle
            label="Bio"
            checked={value.sections.showBio}
            onChange={(v) => setSection("showBio", v)}
          />
          <Toggle
            label="Social links"
            checked={value.sections.showSocials}
            onChange={(v) => setSection("showSocials", v)}
          />
          <Toggle
            label="Featured product"
            checked={value.sections.showFeatured}
            onChange={(v) => setSection("showFeatured", v)}
          />
          <Toggle
            label="All products"
            checked={value.sections.showAllProducts}
            onChange={(v) => setSection("showAllProducts", v)}
          />
          <Toggle
            label="Recent sales ticker"
            checked={value.sections.showRecentSales}
            onChange={(v) => setSection("showRecentSales", v)}
          />
        </div>
      </Panel>
    </div>
  );
}

// ── Small controlled field primitives ─────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6">
      <h3 className="font-semibold text-zinc-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-zinc-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-10 w-12 border border-zinc-300 rounded-lg cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="flex-1 min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div>
      <label className="block text-sm text-zinc-600 mb-1">{label}</label>
      <select
        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-zinc-600 mb-1">{label}</label>
      <input
        type="text"
        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-zinc-700 cursor-pointer">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-zinc-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
