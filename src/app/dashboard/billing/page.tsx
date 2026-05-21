import type { Metadata } from "next";
import { PRICING } from "@/config/pricing";

export const metadata: Metadata = {
  title: "Billing",
};

export default function BillingPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-zinc-900">Billing</h1>
      <p className="mt-1 text-zinc-500">Manage your subscription.</p>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Subscription Status</p>
            <p className="text-xl font-bold text-zinc-900">Active</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-zinc-500">Next billing date</p>
            <p className="font-medium text-zinc-900">July 1, 2025</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">Available Plans</h3>
          <div className="space-y-3">
            {PRICING.tiers.map((tier) => (
              <div key={tier.id} className="flex items-center justify-between p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors">
                <div>
                  <p className="font-bold">{tier.name}</p>
                  <p className="text-xs text-zinc-500">{tier.displayPrice}/{tier.interval}</p>
                </div>
                <button className="text-sm font-medium px-4 py-2 bg-zinc-100 rounded-md hover:bg-zinc-200">
                  Switch
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100">
          <button className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
            Manage via Stripe
          </button>
        </div>
      </div>
    </div>
  );
}
