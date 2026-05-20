import type { Metadata } from "next";
import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { env } from "@/env";

type Props = {
  searchParams: Promise<{ session_id?: string; product?: string }>;
};

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your order has been confirmed",
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id, product: productSlug } = await searchParams;

  let session = null;
  let order = null;

  if (session_id) {
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
      order = await db.order.findUnique({
        where: { stripeSessionId: session_id },
        include: {
          items: { include: { product: true } },
          workspace: { select: { name: true, handle: true } },
        },
      });
    } catch (error) {
      console.error("Error retrieving session:", error);
    }
  }

  const productName = order?.items[0]?.product.name ?? productSlug ?? "your purchase";

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-zinc-900">Sizzle</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Order Confirmed!</h2>
          <p className="text-zinc-500 mb-6">
            Thank you for your purchase. A confirmation email has been sent.
          </p>

          {order && (
            <div className="bg-zinc-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-zinc-900 mb-4">Order Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Order ID</dt>
                  <dd className="font-mono text-sm text-zinc-700">{order.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Amount</dt>
                  <dd className="font-medium text-zinc-900">
                    {order.currency} {Number(order.amount).toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {order.status}
                  </dd>
                </div>
              </dl>

              {order.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-200">
                  <p className="text-sm text-zinc-500 mb-2">Items</p>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-zinc-700">{item.product.name}</span>
                      <span className="font-medium text-zinc-900">
                        {order.currency} {Number(item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {session?.metadata?.productId && (
            <div className="mb-8">
              {order?.items[0]?.product.type === "COURSE" ? (
                <Link
                  href={`/enroll/${session.metadata.productId}`}
                  className="inline-block bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
                >
                  Start Your Course
                </Link>
              ) : (
                <Link
                  href={`/@${order?.workspace.handle ?? ""}`}
                  className="inline-block bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
                >
                  Continue Shopping
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Back to Home
            </Link>
            {order?.workspace.handle && (
              <Link
                href={`/@${order.workspace.handle}`}
                className="px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Visit Shop
              </Link>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-8">
          Questions about your order? Contact support or reply to your confirmation email.
        </p>
      </main>
    </div>
  );
}