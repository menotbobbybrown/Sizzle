import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CourseBuilder } from "@/components/course-builder/course-builder";

export const metadata: Metadata = {
  title: "Course Builder",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CourseBuilderPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Courses
      </Link>

      <CourseBuilder productId={id} />
    </div>
  );
}
