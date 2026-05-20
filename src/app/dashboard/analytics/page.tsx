import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
      <p className="mt-1 text-zinc-500">Track your store performance.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: "$0.00" },
          { label: "Orders", value: "0" },
          { label: "Conversion Rate", value: "0%" },
          { label: "Visitors", value: "0" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-zinc-200 rounded-xl p-4">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
        <h2 className="font-semibold text-zinc-900 mb-4">Revenue (Last 30 Days)</h2>
        <div className="h-64 flex items-center justify-center bg-zinc-50 rounded-lg">
          <p className="text-zinc-400 text-sm">Chart will render here with Recharts</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Top Products</h2>
          <p className="text-sm text-zinc-500">No data yet.</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Recent Orders</h2>
          <p className="text-sm text-zinc-500">No orders yet.</p>
        </div>
      </div>
    </div>
  );
}