import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
      <p className="mt-1 text-zinc-500">Manage your workspace settings.</p>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Display name</label>
          <input
            type="text"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Your name or brand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Handle</label>
          <div className="flex items-center border border-zinc-300 rounded-lg px-3 py-2">
            <span className="text-zinc-400 text-sm">sizzle.so/@</span>
            <input
              type="text"
              className="flex-1 border-0 p-0 text-sm focus:outline-none"
              placeholder="yourhandle"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Bio</label>
          <textarea
            rows={3}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Tell visitors about your store..."
          />
        </div>

        <button className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800">
          Save changes
        </button>
      </div>
    </div>
  );
}