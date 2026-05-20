import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import CheckoutButton from "./CheckoutButton";

type Props = {
  params: Promise<{ productId: string }>;
};

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase",
};

export default async function CheckoutPage({ params }: Props) {
  const { productId } = await params;

  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      workspace: {
        select: { name: true, handle: true, stripeAccountId: true },
      },
    },
  });

  if (!product || product.status !== "PUBLISHED") {
    notFound();
  }

  if (!product.workspace.stripeAccountId) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Checkout Unavailable</h1>
          <p className="text-zinc-500 mb-6">
            This creator hasn&apos;t set up payment processing yet.
          </p>
          <a href={`/@${product.workspace.handle}`} className="text-zinc-900 font-medium hover:underline">
            Return to Store
          </a>
        </div>
      </div>
    );
  }

  const price = Number(product.price);
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency,
  }).format(price);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">@{product.workspace.handle}</p>
            <h1 className="text-xl font-bold text-zinc-900">Checkout</h1>
          </div>
          <a
            href={`/@${product.workspace.handle}/p/${product.slug}`}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back to product
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-zinc-200 p-8">
          <div className="flex gap-6 mb-8">
            {product.imageUrl && (
              <div className="w-24 h-24 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">{product.name}</h2>
              {product.description && (
                <p className="text-zinc-500 mt-1 line-clamp-2">{product.description}</p>
              )}
              <p className="text-2xl font-bold text-zinc-900 mt-2">{formattedPrice}</p>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-6 mb-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Order Summary</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-zinc-500">{product.name}</dt>
                <dd className="font-medium text-zinc-900">{formattedPrice}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2">
                <dt className="font-medium text-zinc-900">Total</dt>
                <dd className="font-bold text-lg text-zinc-900">{formattedPrice}</dd>
              </div>
            </dl>
          </div>

          <CheckoutButton productId={product.id} />

          <p className="text-center text-sm text-zinc-500 mt-6">
            By completing your purchase, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8">
          <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-sm text-zinc-500">Secure checkout powered by Stripe</span>
        </div>
      </main>
    </div>
  );
}