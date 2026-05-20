import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribers",
};

export default function SubscribersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Subscribers</h1>
      <p className="mt-1 text-zinc-500">Manage your email subscribers.</p>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl">
        <div className="p-6">
          <p className="text-zinc-500 text-center py-12">No subscribers yet.</p>
        </div>
      </div>
    </div>
  );
}