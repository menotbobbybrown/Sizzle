import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders",
};

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
      <p className="mt-1 text-zinc-500">View and manage customer orders.</p>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl">
        <div className="p-6">
          <p className="text-zinc-500 text-center py-12">No orders yet.</p>
        </div>
      </div>
    </div>
  );
}