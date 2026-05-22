import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { cache } from "@/lib/cache";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

export const revalidate = 60;

type Props = {
  params: Promise<{ handle: string }>;
};

async function getStorefrontData(handle: string) {
  // 1. Check Redis (Hot path)
  const cached = await cache.getCachedStorefront(handle);
  if (cached) return cached as any;

  // 2. Check Next.js Cache (with tags for revalidation)
  const data = await unstable_cache(
    async () => {
      return db.workspace.findUnique({
        where: { handle },
        include: {
          products: {
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    },
    [`storefront-db-${handle}`],
    {
      tags: [`storefront-${handle}`],
      revalidate: 60,
    }
  )();

  if (data) {
    // Update Redis
    await cache.setCachedStorefront(handle, data);
  }

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const workspace = await getStorefrontData(handle);

  return {
    title: workspace ? `${workspace.name} | Sizzle` : "Store",
    description: workspace?.bio || "Browse our digital products and courses.",
  };
}

export default async function StorePage({ params }: Props) {
  const { handle } = await params;
  const workspace = await getStorefrontData(handle);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900">@{workspace.handle}</h1>
          <span className="text-sm text-zinc-400">Powered by Sizzle</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-zinc-900">
            {workspace.name || "Welcome"}
          </h2>
          {workspace.bio && (
            <p className="mt-2 text-zinc-500">{workspace.bio}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspace.products.map((product: any) => (
            <Link
              key={product.id}
              href={`/@${handle}/p/${product.slug}`}
              className="border border-zinc-200 rounded-xl p-6 hover:shadow-sm transition-shadow group"
            >
              <div className="w-full h-40 bg-zinc-100 rounded-lg mb-4 overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    No image
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-zinc-900">{product.name}</h3>
              <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                {product.description}
              </p>
              <p className="mt-2 font-bold text-zinc-900">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: product.currency || "USD",
                }).format(Number(product.price))}
              </p>
            </Link>
          ))}
          {workspace.products.length === 0 && (
            <p className="text-zinc-500 col-span-full text-center py-12">
              No products found.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
