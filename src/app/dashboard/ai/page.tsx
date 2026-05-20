import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Tools",
};

export default function AiToolsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">AI Tools</h1>
      <p className="mt-1 text-zinc-500">Generate content with AI.</p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Product Titles", description: "Generate SEO-friendly product titles", feature: "title" },
          { title: "Product Descriptions", description: "Write compelling product descriptions", feature: "description" },
          { title: "Email Copy", description: "Draft promotional email content", feature: "email" },
          { title: "Lesson Outlines", description: "Create course lesson structures", feature: "lessonOutline" },
          { title: "Campaign Subjects", description: "Generate email subject lines", feature: "campaignSubject" },
          { title: "Campaign Body", description: "Write full campaign email body", feature: "campaignBody" },
        ].map((tool) => (
          <div
            key={tool.title}
            className="bg-white border border-zinc-200 rounded-xl p-6 hover:shadow-sm transition-shadow cursor-pointer"
          >
            <h3 className="font-semibold text-zinc-900">{tool.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{tool.description}</p>
            <button className="mt-4 text-sm font-medium text-zinc-900 hover:underline">
              Generate &rarr;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}