import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Webhooks",
};

export default function AdminWebhooksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Webhooks</h1>
      <p className="mt-1 text-zinc-500">Monitor incoming webhooks.</p>
      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-zinc-500 text-center py-12">Webhook monitoring interface.</p>
      </div>
    </div>
  );
}