import type { Metadata } from "next";
import Link from "next/link";
import { PRICING } from "@/config/pricing";
import { clsx } from "clsx";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. Plans starting at $29/month.",
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
            Choose the right plan for your growth
          </h1>
          <p className="mt-4 text-lg text-zinc-500">
            All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PRICING.tiers.map((tier) => (
            <div 
              key={tier.id} 
              className={clsx(
                "rounded-2xl p-8 flex flex-col h-full",
                tier.popular 
                  ? "border-2 border-amber-400 shadow-lg relative" 
                  : "border border-zinc-200 shadow-sm"
              )}
            >
              {tier.popular && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-zinc-900">{tier.name}</h2>
                <div className="mt-4">
                  <span className="text-5xl font-bold">{tier.displayPrice}</span>
                  <span className="text-zinc-500 ml-2">/{tier.interval}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-zinc-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/onboarding"
                  className={clsx(
                    "block w-full text-center py-3 rounded-lg font-medium transition-colors",
                    tier.popular
                      ? "bg-black text-white hover:bg-zinc-800"
                      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  )}
                >
                  Start 14-day trial
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
