import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: "Download",
  description: "Access your purchased content",
};

export default async function DownloadPage({ params }: Props) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  const accessToken = await db.accessToken.findUnique({
    where: { tokenHash },
    include: {
      product: {
        include: {
          workspace: {
            select: { name: true, handle: true },
          },
        },
      },
      order: {
        select: {
          id: true,
          customerEmail: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Invalid Download Link</h1>
          <p className="text-zinc-500 mb-6">
            This download link is invalid or has expired. Please check your email for the correct link.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (accessToken.revokedAt) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Download Revoked</h1>
          <p className="text-zinc-500 mb-6">
            This download link has been revoked. Please contact the seller for assistance.
          </p>
          <Link
            href={`/@${accessToken.product.workspace.handle}`}
            className="inline-block px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Visit Store
          </Link>
        </div>
      </div>
    );
  }

  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Download Expired</h1>
          <p className="text-zinc-500 mb-6">
            This download link has expired. Please contact the seller for a new link.
          </p>
          <Link
            href={`/@${accessToken.product.workspace.handle}`}
            className="inline-block px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Visit Store
          </Link>
        </div>
      </div>
    );
  }

  if (accessToken.useCount >= accessToken.maxUses) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Download Limit Reached</h1>
          <p className="text-zinc-500 mb-6">
            You have reached the maximum number of downloads allowed for this purchase.
          </p>
          <Link
            href={`/@${accessToken.product.workspace.handle}`}
            className="inline-block px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Visit Store
          </Link>
        </div>
      </div>
    );
  }

  const remainingUses = accessToken.maxUses - accessToken.useCount;
  const expiresAt = accessToken.expiresAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(accessToken.expiresAt)
    : null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{accessToken.product.workspace.name}</h1>
            <p className="text-sm text-zinc-500">Powered by Sizzle</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-zinc-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Your download is ready!</h2>
            <p className="text-zinc-500">
              {accessToken.product.name}
            </p>
          </div>

          <div className="bg-zinc-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-zinc-900 mb-4">Download Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Product</dt>
                <dd className="font-medium text-zinc-900">{accessToken.product.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Purchase Date</dt>
                <dd className="font-medium text-zinc-900">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(accessToken.order.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Downloads Remaining</dt>
                <dd className="font-medium text-zinc-900">{remainingUses}</dd>
              </div>
              {expiresAt && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Link Expires</dt>
                  <dd className="font-medium text-zinc-900">{expiresAt}</dd>
                </div>
              )}
            </dl>
          </div>

          <a
            href={`/api/access/${token}`}
            className="block w-full bg-zinc-900 text-white text-center py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
          >
            Download {accessToken.product.type === "COURSE" ? "Course Materials" : "Your Files"}
          </a>

          <p className="text-center text-sm text-zinc-500 mt-4">
            Having trouble? Contact the seller at @{accessToken.product.workspace.handle}
          </p>
        </div>
      </main>
    </div>
  );
}