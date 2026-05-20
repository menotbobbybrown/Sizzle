"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export default function CheckoutButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = api.checkout.createSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await createSession.mutateAsync({ productId });
    } catch (err) {
      // Error handled in mutation callbacks
    }
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-zinc-900 text-white py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Redirecting to checkout...
          </>
        ) : (
          "Pay with Stripe"
        )}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}