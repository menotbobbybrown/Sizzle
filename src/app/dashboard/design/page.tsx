import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Editor",
};

export default function DesignPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Design Editor</h1>
      <p className="mt-1 text-zinc-500">Customize your storefront appearance.</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Theme Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Primary color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 border border-zinc-300 rounded-lg cursor-pointer"
                  defaultValue="#000000"
                />
                <span className="text-sm text-zinc-500">#000000</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Accent color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 border border-zinc-300 rounded-lg cursor-pointer"
                  defaultValue="#f59e0b"
                />
                <span className="text-sm text-zinc-500">#f59e0b</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Font</label>
              <select className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm">
                <option>System Default</option>
                <option>Inter</option>
                <option>DM Sans</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Preview</h2>
          <div className="aspect-video bg-zinc-100 rounded-lg flex items-center justify-center">
            <p className="text-zinc-400 text-sm">Live preview will render here</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800">
          Save draft
        </button>
        <button className="bg-amber-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-600">
          Publish
        </button>
      </div>
    </div>
  );
}