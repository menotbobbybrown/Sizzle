"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isReservedHandle } from "@/config/route-map";

export default function OnboardingHandlePage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateHandle = (value: string): string | null => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 2) return "Handle must be at least 2 characters";
    if (clean.length > 49) return "Handle must be under 50 characters";
    if (isReservedHandle(clean)) return "This handle is reserved";
    if (!/^[a-z0-9]/.test(clean)) return "Must start with a letter or number";
    if (!/[a-z0-9]$/.test(clean)) return "Must end with a letter or number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateHandle(handle);
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    // In real implementation, call API to check availability and create workspace
    setTimeout(() => {
      router.push("/onboarding/payout");
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-sm w-full mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Your storefront URL</h1>
          <p className="mt-2 text-zinc-500">
            Choose your unique handle. This will be your storefront URL.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-zinc-700 mb-1">
              Handle
            </label>
            <div className="flex items-center border border-zinc-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-zinc-900">
              <span className="text-zinc-400 text-sm">sizzle.so/@</span>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setError(null);
                }}
                className="flex-1 border-0 p-0 text-sm focus:outline-none"
                placeholder="yourhandle"
                required
                minLength={2}
              />
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !handle}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}