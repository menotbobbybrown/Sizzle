"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/trpc/react";
import { DesignEditor } from "@/components/design-editor/design-editor";
import { StorefrontPreview } from "@/components/design-editor/storefront-preview";
import {
  DEFAULT_THEME,
  mergeTheme,
  type StorefrontThemeConfig,
} from "@/lib/storefront/theme";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  Save,
  RotateCcw,
  Check,
  Monitor,
  Smartphone,
} from "lucide-react";

export default function DesignPage() {
  const utils = api.useUtils();
  const { data: workspace, isLoading } = api.tenant.getCurrent.useQuery();

  const [theme, setTheme] = useState<StorefrontThemeConfig>(DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<StorefrontThemeConfig>(DEFAULT_THEME);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [justSaved, setJustSaved] = useState(false);

  // Load the persisted config once the workspace arrives.
  useEffect(() => {
    if (workspace?.storefront?.config !== undefined) {
      const merged = mergeTheme(workspace.storefront?.config);
      setTheme(merged);
      setSavedTheme(merged);
    }
  }, [workspace]);

  const dirty = useMemo(
    () => JSON.stringify(theme) !== JSON.stringify(savedTheme),
    [theme, savedTheme]
  );

  const updateDesign = api.tenant.updateDesign.useMutation({
    onSuccess: () => {
      setSavedTheme(theme);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      void utils.tenant.getCurrent.invalidate();
    },
    onError: (err) => {
      alert(err.message || "Failed to save design");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!workspace) return null;

  const store = {
    name: workspace.name,
    handle: workspace.handle,
    bio: workspace.bio,
    logoUrl: workspace.logoUrl,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Design Editor</h1>
          <p className="mt-1 text-zinc-500">
            Customize your storefront — changes preview live.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && !updateDesign.isPending && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
          {justSaved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={() => setTheme(DEFAULT_THEME)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <Link
            href={`/@${workspace.handle}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open store
          </Link>
          <button
            onClick={() => updateDesign.mutate({ config: theme })}
            disabled={updateDesign.isPending || !dirty}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {updateDesign.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {updateDesign.isPending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <DesignEditor value={theme} onChange={setTheme} />

        <div className="sticky top-8">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-200 bg-white flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500">Live Preview</span>
              <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5">
                <button
                  onClick={() => setDevice("desktop")}
                  className={`p-1.5 rounded-md ${device === "desktop" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400"}`}
                  aria-label="Desktop preview"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className={`p-1.5 rounded-md ${device === "mobile" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400"}`}
                  aria-label="Mobile preview"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex justify-center bg-zinc-100">
              <div
                className={`bg-white border border-zinc-200 rounded-xl overflow-hidden transition-all ${
                  device === "mobile" ? "w-[320px]" : "w-full"
                }`}
                style={{ height: 560 }}
              >
                <StorefrontPreview theme={theme} store={store} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
