"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingBrandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // In real implementation, save branding preferences
    setTimeout(() => {
      router.push("/dashboard");
    }, 300);
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-sm w-full mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Brand your store</h1>
          <p className="mt-2 text-zinc-500">
            Add your logo and choose your colors. You can always change this later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="logo" className="block text-sm font-medium text-zinc-700 mb-1">
              Logo URL (optional)
            </label>
            <input
              id="logo"
              type="url"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-zinc-700 mb-1">
                Primary color
              </label>
              <input
                id="primaryColor"
                type="color"
                className="w-full h-10 border border-zinc-300 rounded-lg cursor-pointer"
                defaultValue="#000000"
              />
            </div>
            <div>
              <label htmlFor="accentColor" className="block text-sm font-medium text-zinc-700 mb-1">
                Accent color
              </label>
              <input
                id="accentColor"
                type="color"
                className="w-full h-10 border border-zinc-300 rounded-lg cursor-pointer"
                defaultValue="#f59e0b"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue to dashboard"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full border border-zinc-300 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Skip
          </button>
        </form>
      </div>
    </div>
  );
}