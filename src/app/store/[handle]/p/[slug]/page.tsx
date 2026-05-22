import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { cache } from "@/lib/cache";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

export const revalidate = 300;

type Props = {
  params: Promise<{ handle: string; slug: string }>;
};

async function getProductData(handle: string, slug: string) {
  // 1. Check Redis (Hot path)
  const cached = await cache.getCachedProduct(handle, slug);
  if (cached) return cached as any;

  // 2. Check Next.js Cache (with tags for revalidation)
  const data = await unstable_cache(
    async () => {
      const workspace = await db.workspace.findUnique({
        where: { handle },
        select: { id: true },
      });

      if (!workspace) return null;

      return db.product.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId: workspace.id,
            slug,
          },
          status: "PUBLISHED",
        },
        include: {
          workspace: true,
        },
      });
    },
    [`product-db-${handle}-${slug}`],
    {
      tags: [`product-${handle}-${slug}`, `storefront-${handle}`],
      revalidate: 300,
    }
  )();

  if (data) {
    // Update Redis
    await cache.setCachedProduct(handle, slug, data);
  }

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const product = await getProductData(handle, slug);

  return {
    title: product ? `${product.name} | ${product.workspace.name}` : "Product",
    description: product?.description || "Product details.",
  };
}

export default async function StoreProductPage({ params }: Props) {
  const { handle, slug } = await params;
  const product = await getProductData(handle, slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href={`/@${handle}`}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            &larr; Back to store
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="w-full aspect-square bg-zinc-100 rounded-xl overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                No image
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-zinc-900">{product.name}</h1>
            {product.description && (
              <p className="mt-4 text-zinc-600 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            )}
            <p className="mt-6 text-3xl font-bold text-zinc-900">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: product.currency || "USD",
              }).format(Number(product.price))}
            </p>

            <form className="mt-6" action="/api/stripe/checkout" method="POST">
              <input type="hidden" name="productId" value={product.id} />
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
