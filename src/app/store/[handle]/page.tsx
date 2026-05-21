import type { Metadata } from "next";
import { db } from "@/lib/db";
import { RecentSalesTicker } from "@/components/storefront/recent-sales-ticker";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Store",
};

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function StorePage({ params }: Props) {
  const { handle } = await params;

  const workspace = await db.workspace.findUnique({ 
    where: { handle }, 
    include: { 
      products: { 
        where: { status: "PUBLISHED" } 
      },
      recentSales: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { product: true },
      }
    } 
  });

  if (!workspace) {
    return notFound();
  }

  const sales = workspace.recentSales.map(s => ({
    id: s.id,
    buyerName: s.buyerName,
    productName: s.product.name,
  }));

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
          {workspace.products.map((product) => (
            <div key={product.id} className="border border-zinc-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover rounded-lg mb-4" />
              ) : (
                <div className="w-full h-40 bg-zinc-100 rounded-lg mb-4" />
              )}
              <h3 className="font-semibold text-zinc-900">{product.name}</h3>
              <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{product.description}</p>
              <p className="mt-2 font-bold text-zinc-900">
                {product.pricingType === "FREE" ? "Free" : `$${Number(product.price).toFixed(2)}`}
                {product.pricingType === "PWYW" && " (Pay what you want)"}
              </p>
            </div>
          ))}
          {workspace.products.length === 0 && (
            <p className="text-zinc-500">No products available yet.</p>
          )}
        </div>
      </main>

      <RecentSalesTicker sales={sales} />
    </div>
  );
}
