"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPayoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    // In real implementation, create Stripe Connect account link
    // For now, simulate and redirect
    setTimeout(() => {
      router.push("/onboarding/branding");
    }, 300);
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-sm w-full mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Get paid</h1>
          <p className="mt-2 text-zinc-500">
            Connect Stripe to accept payments from your customers. You can set this up later.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            {loading ? "Connecting..." : "Connect Stripe"}
          </button>

          <button
            onClick={handleSkip}
            className="w-full border border-zinc-300 py-3 rounded-lg font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Skip for now
          </button>

          <p className="text-xs text-center text-zinc-400">
            You can always connect payouts later in your dashboard settings.
          </p>
        </div>
      </div>
    </div>
  );
}