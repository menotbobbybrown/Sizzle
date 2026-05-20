import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-zinc-500">Welcome to your creator dashboard.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue", value: "$0.00", change: "+0%" },
          { label: "Orders", value: "0", change: "0" },
          { label: "Products", value: "0", change: "0" },
          { label: "Subscribers", value: "0", change: "+0" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-zinc-200 rounded-xl p-4">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-400">{stat.change} this month</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900">Quick actions</h2>
          <div className="mt-4 space-y-3">
            <Link
              href="/dashboard/products/new"
              className="block w-full text-center border border-zinc-300 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Create a product
            </Link>
            <Link
              href="/dashboard/courses"
              className="block w-full text-center border border-zinc-300 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Build a course
            </Link>
            <Link
              href="/dashboard/design"
              className="block w-full text-center border border-zinc-300 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Customize storefront
            </Link>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900">Recent orders</h2>
          <p className="mt-4 text-sm text-zinc-500">No orders yet. Share your storefront to start selling!</p>
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="font-semibold text-amber-900">Ready to launch?</h2>
        <p className="mt-1 text-sm text-amber-700">
          Your storefront is live at <strong>sizzle.so/@yourhandle</strong>. Share the link to start selling.
        </p>
      </div>
    </div>
  );
}