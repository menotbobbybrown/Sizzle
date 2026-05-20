import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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

  // TODO: Validate enrollment token (this would be a different token system)
  // For now, redirect to the course if user is enrolled
  
  // Find product by token or slug
  const product = await db.product.findFirst({
    where: { 
      OR: [
        { id: token },
        { slug: token },
      ],
      type: "COURSE",
    },
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
  });

  if (!product || !product.course) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Course Not Found</h1>
          <p className="text-zinc-500 mb-6">
            This course doesn&apos;t exist or may have been removed.
          </p>
          <Link href="/" className="text-zinc-900 font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is enrolled
  let enrollment = null;
  if (session?.user?.id) {
    enrollment = await db.enrollment.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: product.id,
        },
      },
    });
  }

  const totalLessons = product.course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );

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
              {totalLessons} lessons across {product.course.modules.length} modules
            </p>
          </div>

          {enrollment ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-green-900">You&apos;re enrolled!</span>
                </div>
                <span className="text-sm text-green-700">Status: {enrollment.status}</span>
              </div>
              <a
                href={`/learn/${product.slug}`}
                className="block w-full bg-zinc-900 text-white text-center py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                Continue Learning
              </a>
            </div>
          ) : session?.user ? (
            <div className="text-center">
              <p className="text-zinc-500 mb-4">You need to purchase this course to access it.</p>
              <Link
                href={`/@${product.workspace.handle}/p/${product.slug}`}
                className="inline-block bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                Purchase Course
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-zinc-500 mb-4">Sign in to access your enrolled courses.</p>
              <Link
                href={`/login?redirect=/enroll/${token}`}
                className="inline-block bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

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
                  <span className="text-sm text-zinc-400 ml-auto">{module.lessons.length} lessons</span>
                </div>
                <ul className="ml-11 space-y-2">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-2 text-sm text-zinc-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      </main>
    </div>
  );
}