import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Store",
};

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function StorePage({ params }: Props) {
  const { handle } = await params;

  // In production, fetch workspace and products from DB
  // const workspace = await db.workspace.findUnique({ where: { handle }, include: { products: { where: { status: "PUBLISHED" } } } });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900">@{handle}</h1>
          <span className="text-sm text-zinc-400">Powered by Sizzle</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-zinc-900">Welcome</h2>
          <p className="mt-2 text-zinc-500">
            Browse our digital products and courses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Product cards would be rendered here from the DB */}
          <div className="border border-zinc-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
            <div className="w-full h-40 bg-zinc-100 rounded-lg mb-4" />
            <h3 className="font-semibold text-zinc-900">Sample Product</h3>
            <p className="mt-1 text-sm text-zinc-500">Get started with your first product.</p>
            <p className="mt-2 font-bold text-zinc-900">$19.00</p>
          </div>
        </div>
      </main>
    </div>
  );
}