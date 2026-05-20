import type { Metadata } from "next";
import Link from "next/link";
import { PRICING } from "@/config/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. Everything you need for $5/month.",
};

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">Sizzle</Link>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900">
            One plan. Everything included.
          </h1>
          <p className="mt-4 text-lg text-zinc-500">
            No tiers, no hidden fees, no transaction costs.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="border-2 border-amber-400 rounded-2xl p-8 shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-900">{PRICING.name}</h2>
              <div className="mt-4">
                <span className="text-5xl font-bold">{PRICING.displayPrice}</span>
                <span className="text-zinc-500 ml-2">/{PRICING.interval}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                {PRICING.trialDays}-day free trial. Cancel anytime.
              </p>
            </div>

            <ul className="mt-8 space-y-3">
              {PRICING.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="/onboarding"
                className="block w-full text-center bg-black text-white py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                Start your {PRICING.trialDays}-day trial
              </Link>
              <p className="mt-3 text-xs text-center text-zinc-400">
                No credit card required. Start building for free.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}