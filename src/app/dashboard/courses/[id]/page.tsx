import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Course Builder",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CourseBuilderPage({ params }: Props) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Course Builder</h1>
      <p className="mt-1 text-zinc-500">ID: {id}</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-zinc-200 rounded-xl p-4">
            <h2 className="font-semibold text-zinc-900 mb-4">Modules</h2>
            <div className="space-y-2">
              <div className="border border-zinc-200 rounded-lg p-3 text-sm text-zinc-500">
                Drag-and-drop module reordering will render here with dnd-kit
              </div>
            </div>
            <button className="mt-4 w-full border border-dashed border-zinc-300 rounded-lg py-2 text-sm text-zinc-500 hover:text-zinc-700 hover:border-zinc-400">
              + Add module
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <h2 className="font-semibold text-zinc-900 mb-4">Lesson Content</h2>
            <div className="h-64 flex items-center justify-center bg-zinc-50 rounded-lg">
              <p className="text-zinc-400 text-sm">Tiptap rich text editor will render here</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-zinc-500">Mux video upload will render here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}