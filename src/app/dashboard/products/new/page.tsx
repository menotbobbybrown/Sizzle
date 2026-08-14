"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { api } from "@/trpc/react";
import { normalizeProductSlug } from "@/lib/product-form";

const productTypes = ["DIGITAL", "COURSE", "FREEBIE", "COACHING", "MEMBERSHIP"] as const;

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [type, setType] = useState<(typeof productTypes)[number]>("DIGITAL");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [error, setError] = useState<string | null>(null);
  const createProduct = api.product.create.useMutation({
    onSuccess: () => router.push("/dashboard/products"),
    onError: (mutationError) => setError(mutationError.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSlug = normalizeProductSlug(slug || name);
    const numericPrice = Number(price);
    if (!name.trim()) return setError("Enter a product name.");
    if (!normalizedSlug || normalizedSlug.length < 2) return setError("Enter a valid lowercase product slug.");
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return setError("Enter a valid price of zero or more.");
    setError(null);
    createProduct.mutate({ name: name.trim(), slug: normalizedSlug, description: description.trim() || undefined, price: numericPrice, type, status });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 no-underline hover:text-zinc-900"><ArrowLeft className="h-4 w-4" /> Back to products</Link>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600"><Sparkles className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">New catalog item</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Create product</h1><p className="mt-2 text-sm leading-6 text-zinc-500">This form writes directly through Sizzle&apos;s authenticated creator product procedure.</p></div></div>
        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-zinc-700">Product name<input value={name} onChange={(event) => { setName(event.target.value); if (!slug) setSlug(normalizeProductSlug(event.target.value)); }} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 transition focus:ring-2" placeholder="The ultimate guide" autoFocus /></label><label className="block text-sm font-semibold text-zinc-700">URL slug<input value={slug} onChange={(event) => setSlug(normalizeProductSlug(event.target.value))} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 transition focus:ring-2" placeholder="the-ultimate-guide" /><span className="mt-1 block text-xs font-normal text-zinc-500">Lowercase letters, numbers, and hyphens only.</span></label></div>
          <label className="block text-sm font-semibold text-zinc-700">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-28 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 transition focus:ring-2" placeholder="Explain the outcome, format, and value for buyers." /></label>
          <div className="grid gap-5 sm:grid-cols-3"><label className="block text-sm font-semibold text-zinc-700">Product type<select value={type} onChange={(event) => setType(event.target.value as (typeof productTypes)[number])} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 transition focus:ring-2">{productTypes.map((productType) => <option key={productType} value={productType}>{productType.toLowerCase()}</option>)}</select></label><label className="block text-sm font-semibold text-zinc-700">Price (USD)<input type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 transition focus:ring-2" /></label><label className="block text-sm font-semibold text-zinc-700">Visibility<select value={status} onChange={(event) => setStatus(event.target.value as "DRAFT" | "PUBLISHED")} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 transition focus:ring-2"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label></div>
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end"><Link href="/dashboard/products" className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-zinc-600 no-underline hover:bg-zinc-100">Cancel</Link><button type="submit" disabled={createProduct.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">{createProduct.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create product"}</button></div>
        </form>
      </div>
    </div>
  );
}
