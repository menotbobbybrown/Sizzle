import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Campaign",
};

export default function NewCampaignPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-zinc-900">New Campaign</h1>
      <p className="mt-1 text-zinc-500">Create an email campaign for your subscribers.</p>

      <form className="mt-8 bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Campaign name</label>
          <input
            type="text"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="e.g. Launch Announcement"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Subject line</label>
          <input
            type="text"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="Your subject line"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Segment (optional)</label>
          <select className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All subscribers</option>
            <option value="purchased">Past purchasers</option>
            <option value="non-purchased">Non-purchasers</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email content</label>
          <textarea
            rows={8}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="Write your email content here..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          Create campaign
        </button>
      </form>
    </div>
  );
}