import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover creators and products",
};

export default async function ExplorePage({ searchParams }: Props) {
  const { q } = await searchParams;

  const workspaces = await db.workspace.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { handle: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      products: {
        where: { status: "PUBLISHED" },
        take: 3,
      },
      _count: {
        select: { products: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Explore</h1>
          <p className="text-zinc-500">Discover creators and their products</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <form className="mb-8">
          <div className="relative max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              name="q"
              placeholder="Search creators..."
              defaultValue={q}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </form>

        {workspaces.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">No creators found</h2>
            <p className="text-zinc-500">
              {q ? `No results for "${q}"` : "Check back soon for new creators!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/@${workspace.handle}`}
                className="group block bg-white border border-zinc-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full overflow-hidden flex-shrink-0">
                    {workspace.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={workspace.logoUrl}
                        alt={workspace.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-400">
                        {workspace.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-600">
                      @{workspace.handle}
                    </h3>
                    <p className="text-sm text-zinc-500 truncate">{workspace.name}</p>
                  </div>
                </div>

                {workspace.products.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-100">
                    <p className="text-sm text-zinc-500 mb-2">
                      {workspace._count.products} product{workspace._count.products !== 1 ? "s" : ""}
                    </p>
                    <div className="flex gap-2">
                      {workspace.products.slice(0, 3).map((product) => (
                        <div
                          key={product.id}
                          className="w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0"
                        >
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}