import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Get Started",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Welcome to Sizzle</h1>
          <p className="mt-2 text-zinc-500">
            Set up your creator workspace in just a few steps.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <Link
            href="/onboarding/account"
            className="flex items-center justify-center w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
          >
            Get started
          </Link>
          <p className="mt-3 text-xs text-center text-zinc-400">
            Free 14-day trial. No credit card required.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {[
            { step: "1", title: "Create account", description: "Set up your profile" },
            { step: "2", title: "Choose your handle", description: "Your storefront URL" },
            { step: "3", title: "Connect payout", description: "Stripe Connect setup" },
            { step: "4", title: "Brand your store", description: "Logo and colors" },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600">
                {item.step}
              </div>
              <div>
                <h3 className="font-medium text-zinc-900">{item.title}</h3>
                <p className="text-sm text-zinc-500">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}