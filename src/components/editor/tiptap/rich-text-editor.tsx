"use client";

// Placeholder for Tiptap rich text editor integration
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Image from "@tiptap/extension-image";
// import Link from "@tiptap/extension-link";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  return (
    <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 bg-zinc-50">
        {["Bold", "Italic", "Heading", "Bullet List", "Link"].map((tool) => (
          <button
            key={tool}
            className="px-2 py-1 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded"
            title={tool}
          >
            {tool === "Bold" && <strong>B</strong>}
            {tool === "Italic" && <em>I</em>}
            {tool === "Heading" && "H"}
            {tool === "Bullet List" && "•"}
            {tool === "Link" && "🔗"}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="p-4 min-h-[200px]">
        <textarea
          className="w-full min-h-[200px] border-0 resize-none focus:outline-none text-sm leading-relaxed text-zinc-900"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}