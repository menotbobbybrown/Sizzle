"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingAccountPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // In real implementation, call API to update user profile
    // For now, simulate and redirect
    setTimeout(() => {
      router.push("/onboarding/handle");
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-sm w-full mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Your account</h1>
          <p className="mt-2 text-zinc-500">Tell us about yourself.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
              Display name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Your name or brand"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}