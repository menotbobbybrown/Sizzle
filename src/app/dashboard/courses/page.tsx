import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Courses",
};

export default function CoursesPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Courses</h1>
          <p className="mt-1 text-zinc-500">Create and manage your courses.</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800"
        >
          New course
        </Link>
      </div>

      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-zinc-500 text-center py-12">
          No courses yet. Create a course product to get started.
        </p>
      </div>
    </div>
  );
}