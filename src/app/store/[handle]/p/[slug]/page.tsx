import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Product",
};

type Props = {
  params: Promise<{ handle: string; slug: string }>;
};

export default async function StoreProductPage({ params }: Props) {
  const { handle, slug } = await params;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href={`/store/${handle}`} className="text-sm text-zinc-500 hover:text-zinc-900">
            &larr; Back to store
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="w-full aspect-square bg-zinc-100 rounded-xl" />

          <div>
            <h1 className="text-3xl font-bold text-zinc-900 capitalize">{slug.replace(/-/g, " ")}</h1>
            <p className="mt-4 text-zinc-600 leading-relaxed">
              Product description goes here. This would be loaded from the database.
            </p>
            <p className="mt-6 text-3xl font-bold text-zinc-900">$29.00</p>

            <form className="mt-6">
              <input type="hidden" name="productId" value="placeholder" />
              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                Buy now
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}