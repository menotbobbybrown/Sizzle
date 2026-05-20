import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Campaigns",
};

export default function CampaignsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Email Campaigns</h1>
          <p className="mt-1 text-zinc-500">Create and send email campaigns to your subscribers.</p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800"
        >
          New campaign
        </Link>
      </div>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-zinc-500 text-center py-12">
          No campaigns yet. Create your first email campaign.
        </p>
      </div>
    </div>
  );
}