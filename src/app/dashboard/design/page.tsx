"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { DesignEditor } from "@/components/design-editor/design-editor";
import Link from "next/link";
import { ExternalLink, Loader2, Save } from "lucide-react";

export default function DesignPage() {
  const utils = api.useUtils();
  const { data: workspace, isLoading } = api.tenant.getCurrent.useQuery();
  
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (workspace?.storefront?.config) {
      setConfig(workspace.storefront.config as Record<string, any>);
    }
  }, [workspace]);

  const updateDesign = api.tenant.updateDesign.useMutation({
    onSuccess: () => {
      alert("Design saved successfully");
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

  const handleSave = () => {
    updateDesign.mutate({ config });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Design Editor</h1>
          <p className="mt-1 text-zinc-500">Customize your storefront appearance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/@${workspace.handle}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Preview
          </Link>
          <button
            onClick={handleSave}
            disabled={updateDesign.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {updateDesign.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DesignEditor 
          config={config} 
          onConfigChange={(newConfig) => setConfig(newConfig)} 
        />
        
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden sticky top-8">
          <div className="p-4 border-b border-zinc-200 bg-white flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Live Preview</span>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
            </div>
          </div>
          <div className="aspect-[4/3] relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-sm p-8 text-center">
              <p>Preview will update after saving.</p>
              <p className="mt-2 text-zinc-400/60">Using real-time preview in the next iteration.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
