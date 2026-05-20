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

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Current plan</p>
            <p className="text-xl font-bold text-zinc-900">{PRICING.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500">{PRICING.displayPrice}/{PRICING.interval}</p>
            <p className="text-xs text-amber-600 font-medium">{PRICING.trialDays}-day trial</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-100">
          <button className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
            Manage subscription
          </button>
        </div>
      </div>
    </div>
  );
}