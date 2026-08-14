"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, BookOpen, ExternalLink, Loader2, PackagePlus, Power, Trash2 } from "lucide-react";
import { productPriceLabel } from "@/lib/product-form";
import { api } from "@/trpc/react";

function productStatusClass(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "ARCHIVED") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-zinc-100 text-zinc-600 ring-zinc-200";
}

export default function ProductsPage() {
  const utils = api.useUtils();
  const [message, setMessage] = useState<string | null>(null);
  const products = api.product.listMine.useQuery();
  const toggleStatus = api.product.toggleActive.useMutation({
    onSuccess: async (product) => {
      setMessage(`${product.name} is now ${product.status.toLowerCase()}.`);
      await utils.product.listMine.invalidate();
    },
  });
  const deleteProduct = api.product.delete.useMutation({
    onSuccess: async () => {
      setMessage("Product deleted.");
      await utils.product.listMine.invalidate();
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete ${name}? Products with completed orders cannot be deleted.`)) {
      deleteProduct.mutate({ id });
    }
  };

  const error = products.error ?? toggleStatus.error ?? deleteProduct.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Workspace catalog</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Create, publish, unpublish, and manage the products stored in your Sizzle workspace.</p>
        </div>
        <Link href="/dashboard/products/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-zinc-700">
          <PackagePlus className="h-4 w-4" /> New product
        </Link>
      </div>

      <div aria-live="polite">
        {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p> : null}
      </div>

      {products.isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-xl border border-zinc-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-zinc-400" /></div>
      ) : products.data?.length ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_104px_92px_96px_142px] gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:grid">
            <span>Product</span><span>Type</span><span>Price</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {products.data.map((product) => (
              <article key={product.id} className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_104px_92px_96px_142px] lg:items-center">
                <div className="min-w-0"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-400">{product.type === "COURSE" ? <BookOpen className="h-5 w-5" /> : <Archive className="h-5 w-5" />}</div><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-zinc-900">{product.name}</h2><p className="mt-1 truncate text-xs text-zinc-500">/{product.slug} · {product._count.orderItems} order{product._count.orderItems === 1 ? "" : "s"}</p></div></div></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 lg:hidden">Type</p><p className="mt-1 text-sm text-zinc-600 lg:mt-0">{product.type.toLowerCase()}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 lg:hidden">Price</p><p className="mt-1 text-sm font-medium text-zinc-900 lg:mt-0">{productPriceLabel(product.price, product.currency)}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 lg:hidden">Status</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset lg:mt-0 ${productStatusClass(product.status)}`}>{product.status}</span></div>
                <div className="flex flex-wrap gap-2 lg:justify-end"><Link href={`/${product.workspace.handle}/${product.slug}`} aria-label={`View ${product.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 no-underline hover:bg-zinc-50"><ExternalLink className="h-4 w-4" /></Link><button type="button" onClick={() => toggleStatus.mutate({ id: product.id })} disabled={toggleStatus.isPending} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"><Power className="h-3.5 w-3.5" />{product.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => handleDelete(product.id, product.name)} disabled={deleteProduct.isPending} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${product.name}`}><Trash2 className="h-4 w-4" /></button></div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400"><PackagePlus className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-zinc-900">Your catalog is ready for its first product</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Create a digital product, course, coaching offer, membership, or freebie. It will save directly to your active Sizzle workspace.</p><Link href="/dashboard/products/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-zinc-700"><PackagePlus className="h-4 w-4" /> Create product</Link></div>
      )}
    </div>
  );
}
