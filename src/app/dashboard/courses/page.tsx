"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Loader2, BookOpen, Plus } from "lucide-react";

export default function CoursesPage() {
  const { data: courses, isLoading } = api.course.listForCreator.useQuery();

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

      {isLoading ? (
        <div className="mt-8 flex items-center justify-center min-h-[240px]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : !courses || courses.length === 0 ? (
        <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-zinc-900 font-medium">No courses yet</p>
            <p className="text-zinc-500 mt-1">
              Create a course product, then build its curriculum here.
            </p>
            <Link
              href="/dashboard/products/new"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 hover:underline"
            >
              <Plus className="w-4 h-4" />
              New course
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/courses/${c.id}`}
              className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all"
            >
              <div className="aspect-[16/9] bg-zinc-100 overflow-hidden">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-zinc-900 truncate group-hover:text-zinc-600">
                    {c.name}
                  </h3>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      c.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {c.moduleCount} module{c.moduleCount === 1 ? "" : "s"} ·{" "}
                  {c.lessonCount} lesson{c.lessonCount === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
