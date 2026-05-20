import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Admin Overview</h1>
      <p className="mt-1 text-zinc-500">Platform administration and moderation.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: "0" },
          { label: "Active Stores", value: "0" },
          { label: "Total Orders", value: "0" },
          { label: "Revenue", value: "$0.00" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-zinc-200 rounded-xl p-4">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}