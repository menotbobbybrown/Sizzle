import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Product",
};

export default function NewProductPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-zinc-900">Create Product</h1>
      <p className="mt-1 text-zinc-500">List a new digital product or course.</p>

      <form className="mt-8 bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Product name</label>
          <input
            type="text"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="e.g. The Ultimate Guide"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Slug</label>
          <input
            type="text"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="the-ultimate-guide"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
          <select className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
            <option value="DIGITAL">Digital Product</option>
            <option value="COURSE">Course</option>
            <option value="FREEBIE">Freebie</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="29.00"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          Create product
        </button>
      </form>
    </div>
  );
}