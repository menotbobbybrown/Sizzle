"use client";

type DesignEditorProps = {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
};

export function DesignEditor({ config, onConfigChange }: DesignEditorProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <h3 className="font-semibold text-zinc-900 mb-4">Colors</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-1">
              Primary
            </label>
            <input
              type="color"
              className="w-full h-10 border border-zinc-300 rounded-lg cursor-pointer"
              defaultValue="#000000"
              onChange={(e) =>
                onConfigChange({ ...config, primaryColor: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-1">
              Accent
            </label>
            <input
              type="color"
              className="w-full h-10 border border-zinc-300 rounded-lg cursor-pointer"
              defaultValue="#f59e0b"
              onChange={(e) =>
                onConfigChange({ ...config, accentColor: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <h3 className="font-semibold text-zinc-900 mb-4">Typography</h3>
        <div>
          <label className="block text-sm text-zinc-600 mb-1">Font</label>
          <select
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            onChange={(e) =>
              onConfigChange({ ...config, font: e.target.value })
            }
            defaultValue="system"
          >
            <option value="system">System Default</option>
            <option value="inter">Inter</option>
            <option value="dm-sans">DM Sans</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <h3 className="font-semibold text-zinc-900 mb-4">Layout</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" defaultChecked />
            Show header
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" defaultChecked />
            Show footer
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" />
            Show social links
          </label>
        </div>
      </div>
    </div>
  );
}