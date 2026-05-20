import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Manage your email preferences",
};

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;

  // Token is the subscriber ID with a hash
  const subscriber = await db.subscriber.findFirst({
    where: {
      id: token, // In production, this would be a proper unsubscribe token
    },
  });

  if (!subscriber) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Invalid Link</h1>
          <p className="text-zinc-500 mb-6">
            This unsubscribe link is invalid or has expired.
          </p>
          <Link href="/" className="text-zinc-900 font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Process unsubscribe
  await db.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "UNSUBSCRIBED",
      unsubscribedAt: new Date(),
    },
  });

  // Log the event
  await db.emailEvent.create({
    data: {
      subscriberId: subscriber.id,
      type: "UNSUBSCRIBED",
      metadata: {
        reason: "user_unsubscribe",
      },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">You&apos;re unsubscribed</h1>
        <p className="text-zinc-500 mb-6">
          You&apos;ve been removed from the email list. You may still receive transactional emails related to your purchases.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}