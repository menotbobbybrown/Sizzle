import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: "Enroll",
  description: "Access your course",
};

export default async function EnrollPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  // ── Validate the enrollment/access token ─────────────────────────
  // Hash the raw token and look up in the AccessToken table
  const tokenHash = hashToken(token);

  const accessToken = await db.accessToken.findUnique({
    where: { tokenHash },
    include: {
      product: {
        include: {
          workspace: { select: { name: true, handle: true } },
          course: {
            include: {
              modules: {
                include: { lessons: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      order: true,
    },
  });

  // ── Token not found ──────────────────────────────────────────────
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Invalid Link</h1>
          <p className="text-zinc-500 mb-6">
            This enrollment link is invalid or does not exist. Please check the link or contact the creator for support.
          </p>
          <Link href="/" className="text-zinc-900 font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── Token expired ────────────────────────────────────────────────
  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Link Expired</h1>
          <p className="text-zinc-500 mb-6">
            This enrollment link has expired. Please contact the creator for a new link.
          </p>
          <Link href="/" className="text-zinc-900 font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── Token revoked ────────────────────────────────────────────────
  if (accessToken.revokedAt) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Access Revoked</h1>
          <p className="text-zinc-500 mb-6">
            This enrollment link has been revoked. Please contact the creator for assistance.
          </p>
          <Link href="/" className="text-zinc-900 font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── Token exhausted ──────────────────────────────────────────────
  if (accessToken.maxUses > 0 && accessToken.useCount >= accessToken.maxUses) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Link Already Used</h1>
          <p className="text-zinc-500 mb-6">
            This enrollment link has already been used the maximum number of times.
          </p>
          <Link href="/" className="text-zinc-900 font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── Product validation ───────────────────────────────────────────
  const product = accessToken.product;

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Product Not Found</h1>
          <p className="text-zinc-500 mb-6">
            The product associated with this link no longer exists.
          </p>
          <Link href="/" className="text-zinc-900 font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── Authenticated user: upsert enrollment and redirect ───────────
  if (session?.user?.id) {
    const userId = session.user.id;

    // Check for existing enrollment
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: product.id,
        },
      },
    });

    // For COURSE type products, upsert enrollment as ACTIVE
    if (product.type === "COURSE") {
      if (!existingEnrollment || existingEnrollment.status !== "ACTIVE") {
        await db.enrollment.upsert({
          where: {
            userId_productId: {
              userId,
              productId: product.id,
            },
          },
          update: { status: "ACTIVE" },
          create: {
            userId,
            productId: product.id,
            status: "ACTIVE",
          },
        });
      }

      // Increment token use count
      await db.accessToken.update({
        where: { id: accessToken.id },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }

    // Redirect enrolled user to product/course page with enrolled marker
    const productSlug = product.slug;
    if (productSlug) {
      redirect(`/store/${product.workspace.handle}/p/${productSlug}?enrolled=true`);
    } else {
      redirect(`/dashboard/courses/${product.id}`);
    }
  }

  // ── Not logged in: show sign-in CTA ──────────────────────────────
  const totalLessons = product.course?.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  ) ?? 0;

  const totalModules = product.course?.modules.length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">@{product.workspace.handle}</p>
            <h1 className="text-xl font-bold text-zinc-900">{product.name}</h1>
          </div>
          <Link
            href={`/@${product.workspace.handle}`}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back to store
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-zinc-200 p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Ready to start learning?</h2>
            <p className="text-zinc-500">
              {totalLessons > 0
                ? `${totalLessons} lessons across ${totalModules} modules`
                : "Access your purchased content"}
            </p>
          </div>

          <div className="text-center">
            <p className="text-zinc-500 mb-4">Sign in to access your enrolled courses.</p>
            <Link
              href={`/login?redirect=/enroll/${token}`}
              className="inline-block bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {product.course && (
          <div className="bg-white rounded-xl border border-zinc-200 p-8">
            <h3 className="font-semibold text-zinc-900 mb-6">Course Contents</h3>
            <div className="space-y-6">
              {product.course.modules.map((module, index) => (
                <div key={module.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600">
                      {index + 1}
                    </span>
                    <h4 className="font-medium text-zinc-900">{module.title}</h4>
                    <span className="text-sm text-zinc-400 ml-auto">
                      {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="ml-11 space-y-2">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center gap-2 text-sm text-zinc-600">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {lesson.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}