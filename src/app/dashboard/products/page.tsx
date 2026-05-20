import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Products",
};

export default function ProductsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
          <p className="mt-1 text-zinc-500">Manage your digital products and courses.</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800"
        >
          New product
        </Link>
      </div>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-zinc-500 text-center py-12">
          No products yet. Create your first product to start selling.
        </p>
      </div>
    </div>
  );
}