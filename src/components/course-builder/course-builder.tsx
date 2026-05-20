"use client";

// Placeholder for dnd-kit integration
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
// import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";

type Module = {
  id: string;
  title: string;
  order: number;
  lessons: Array<{ id: string; title: string; order: number }>;
};

type CourseBuilderProps = {
  modules: Module[];
  onReorder: (modules: Module[]) => void;
};

export function CourseBuilder({ modules, onReorder }: CourseBuilderProps) {
  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <div
          key={module.id}
          className="border border-zinc-200 rounded-xl bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="cursor-grab text-zinc-400">⠿</span>
              <h3 className="font-medium text-zinc-900">{module.title}</h3>
            </div>
            <span className="text-xs text-zinc-400">
              {module.lessons.length} lessons
            </span>
          </div>

          {module.lessons.length > 0 && (
            <div className="mt-3 ml-8 space-y-2">
              {module.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 px-3 py-2 bg-zinc-50 rounded-lg text-sm"
                >
                  <span className="cursor-grab text-zinc-400">⠿</span>
                  <span className="text-zinc-700">{lesson.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button className="w-full border-2 border-dashed border-zinc-300 rounded-xl py-4 text-sm text-zinc-500 hover:text-zinc-700 hover:border-zinc-400 transition-colors">
        + Add module
      </button>
    </div>
  );
}