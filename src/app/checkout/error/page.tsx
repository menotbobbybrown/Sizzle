import type { Metadata } from "next";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export const metadata: Metadata = {
  title: "Checkout Error",
  description: "We couldn't start your checkout",
};

export default async function CheckoutErrorPage({ searchParams }: Props) {
  const { message } = await searchParams;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Checkout couldn&apos;t start</h1>
        <p className="text-zinc-500 mb-8">
          {message ?? "Something went wrong while creating your checkout session. Please try again."}
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
