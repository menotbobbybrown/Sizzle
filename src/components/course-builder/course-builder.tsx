"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  GripVertical,
  Check,
} from "lucide-react";

type LessonType = "TEXT" | "VIDEO" | "EMBED" | "QUIZ";

const LESSON_TYPES: LessonType[] = ["TEXT", "VIDEO", "EMBED", "QUIZ"];

/** Move item at `index` by `dir` (-1 up, +1 down); returns a new id array. */
function reordered(ids: string[], index: number, dir: -1 | 1): string[] | null {
  const to = index + dir;
  if (to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

export function CourseBuilder({ productId }: { productId: string }) {
  const utils = api.useUtils();
  const { data, isLoading } = api.course.getBuilder.useQuery({ productId });

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const invalidate = () => utils.course.getBuilder.invalidate({ productId });

  const createModule = api.module.create.useMutation({ onSuccess: invalidate });
  const updateModule = api.module.update.useMutation({ onSuccess: invalidate });
  const deleteModule = api.module.delete.useMutation({ onSuccess: invalidate });
  const reorderModules = api.module.reorder.useMutation({ onSuccess: invalidate });
  const createLesson = api.lesson.create.useMutation({
    onSuccess: (lesson) => {
      setSelectedLessonId(lesson.id);
      void invalidate();
    },
  });
  const deleteLesson = api.lesson.delete.useMutation({ onSuccess: invalidate });
  const reorderLessons = api.lesson.reorder.useMutation({ onSuccess: invalidate });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (!data) return null;

  const { course, product } = data;
  const modules = course.modules;
  const moduleIds = modules.map((m) => m.id);
  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>
        <p className="mt-1 text-zinc-500">
          {modules.length} module{modules.length === 1 ? "" : "s"} ·{" "}
          {totalLessons} lesson{totalLessons === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* ── Curriculum tree ─────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-900">Curriculum</h2>
            <span className="text-xs text-zinc-400">
              {modules.length} module{modules.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-4">
            {modules.map((mod, mIdx) => {
              const lessonIds = mod.lessons.map((l) => l.id);
              return (
                <div key={mod.id} className="border border-zinc-200 rounded-lg">
                  {/* Module header */}
                  <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-t-lg">
                    <GripVertical className="w-4 h-4 text-zinc-300 shrink-0" />
                    {editingModuleId === mod.id ? (
                      <input
                        autoFocus
                        defaultValue={mod.title}
                        className="flex-1 min-w-0 text-sm font-medium border border-zinc-300 rounded px-2 py-1"
                        onBlur={(e) => {
                          const title = e.target.value.trim();
                          if (title && title !== mod.title) {
                            updateModule.mutate({ id: mod.id, title });
                          }
                          setEditingModuleId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") setEditingModuleId(null);
                        }}
                      />
                    ) : (
                      <button
                        className="flex-1 min-w-0 text-left text-sm font-medium text-zinc-900 truncate hover:text-zinc-600"
                        onClick={() => setEditingModuleId(mod.id)}
                        title="Rename module"
                      >
                        {mod.title}
                      </button>
                    )}
                    <IconBtn
                      label="Move module up"
                      disabled={mIdx === 0 || reorderModules.isPending}
                      onClick={() => {
                        const next = reordered(moduleIds, mIdx, -1);
                        if (next) reorderModules.mutate({ courseId: course.id, moduleIds: next });
                      }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </IconBtn>
                    <IconBtn
                      label="Move module down"
                      disabled={mIdx === modules.length - 1 || reorderModules.isPending}
                      onClick={() => {
                        const next = reordered(moduleIds, mIdx, 1);
                        if (next) reorderModules.mutate({ courseId: course.id, moduleIds: next });
                      }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </IconBtn>
                    <IconBtn
                      label="Delete module"
                      onClick={() => {
                        if (confirm(`Delete "${mod.title}" and its lessons?`)) {
                          deleteModule.mutate({ id: mod.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </IconBtn>
                  </div>

                  {/* Lessons */}
                  <div className="p-2 space-y-1">
                    {mod.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer ${
                          selectedLessonId === lesson.id
                            ? "bg-zinc-900 text-white"
                            : "hover:bg-zinc-100 text-zinc-700"
                        }`}
                        onClick={() => setSelectedLessonId(lesson.id)}
                      >
                        <span className="flex-1 min-w-0 truncate">{lesson.title}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wide ${
                            selectedLessonId === lesson.id ? "text-zinc-300" : "text-zinc-400"
                          }`}
                        >
                          {lesson.lessonType}
                        </span>
                        <IconBtn
                          label="Move lesson up"
                          disabled={lIdx === 0 || reorderLessons.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = reordered(lessonIds, lIdx, -1);
                            if (next) reorderLessons.mutate({ moduleId: mod.id, lessonIds: next });
                          }}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn
                          label="Move lesson down"
                          disabled={lIdx === mod.lessons.length - 1 || reorderLessons.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = reordered(lessonIds, lIdx, 1);
                            if (next) reorderLessons.mutate({ moduleId: mod.id, lessonIds: next });
                          }}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn
                          label="Delete lesson"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${lesson.title}"?`)) {
                              if (selectedLessonId === lesson.id) setSelectedLessonId(null);
                              deleteLesson.mutate({ id: lesson.id });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </IconBtn>
                      </div>
                    ))}

                    <button
                      className="w-full flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 px-2 py-1.5"
                      disabled={createLesson.isPending}
                      onClick={() =>
                        createLesson.mutate({
                          moduleId: mod.id,
                          title: "New lesson",
                          lessonType: "TEXT",
                          order: mod.lessons.length,
                        })
                      }
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add lesson
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="mt-4 w-full flex items-center justify-center gap-2 border border-dashed border-zinc-300 rounded-lg py-2.5 text-sm text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 disabled:opacity-50"
            disabled={createModule.isPending}
            onClick={() =>
              createModule.mutate({
                courseId: course.id,
                title: "New module",
                order: modules.length,
              })
            }
          >
            {createModule.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add module
          </button>
        </div>
      </div>

      {/* ── Lesson editor ───────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <LessonEditor
          key={selectedLessonId ?? "none"}
          lesson={
            selectedLessonId
              ? modules
                  .flatMap((m) => m.lessons)
                  .find((l) => l.id === selectedLessonId) ?? null
              : null
          }
          onSaved={invalidate}
        />
      </div>
      </div>
    </div>
  );
}

type EditableLesson = {
  id: string;
  title: string;
  lessonType: LessonType;
  content: string | null;
  videoUrl: string | null;
};

function LessonEditor({
  lesson,
  onSaved,
}: {
  lesson: EditableLesson | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("TEXT");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setTitle(lesson?.title ?? "");
    setLessonType(lesson?.lessonType ?? "TEXT");
    setContent(lesson?.content ?? "");
    setVideoUrl(lesson?.videoUrl ?? "");
  }, [lesson]);

  const update = api.lesson.update.useMutation({
    onSuccess: () => {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onSaved();
    },
    onError: (e) => alert(e.message || "Failed to save lesson"),
  });

  if (!lesson) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400">
        Select a lesson to edit, or add one to get started.
      </div>
    );
  }

  const showVideo = lessonType === "VIDEO" || lessonType === "EMBED";

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Lesson</h2>
        {justSaved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
      </div>

      <div>
        <label className="block text-sm text-zinc-600 mb-1">Title</label>
        <input
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-600 mb-1">Type</label>
        <select
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          value={lessonType}
          onChange={(e) => setLessonType(e.target.value as LessonType)}
        >
          {LESSON_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {showVideo && (
        <div>
          <label className="block text-sm text-zinc-600 mb-1">
            {lessonType === "EMBED" ? "Embed URL" : "Video URL"}
          </label>
          <input
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            placeholder="https://…"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="block text-sm text-zinc-600 mb-1">
          Content {lessonType === "TEXT" ? "(Markdown supported)" : "(notes)"}
        </label>
        <textarea
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono min-h-[220px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your lesson content here…"
        />
      </div>

      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-zinc-800 disabled:opacity-50"
          disabled={update.isPending || !title.trim()}
          onClick={() =>
            update.mutate({
              id: lesson.id,
              title: title.trim(),
              lessonType,
              content,
              videoUrl: showVideo ? videoUrl || null : null,
            })
          }
        >
          {update.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save lesson
        </button>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="p-1 rounded hover:bg-zinc-200/70 text-zinc-500 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
