import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">Sizzle</span>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="text-sm font-medium bg-black text-white px-4 py-2 rounded-lg hover:bg-zinc-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900">
            Your creator business,
            <br />
            <span className="text-amber-500">simplified.</span>
          </h1>
          <p className="mt-6 text-xl text-zinc-500 max-w-2xl mx-auto">
            Sell courses, digital products, and more. Built-in email marketing, AI tools, and analytics.
            Everything for <strong className="text-zinc-900">$5/month</strong>.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              Start building
            </Link>
            <Link
              href="/pricing"
              className="border border-zinc-300 px-8 py-3 rounded-lg font-medium hover:bg-zinc-50 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Storefront & Checkout",
                description: "Beautiful storefront with Stripe checkout. Custom domain support.",
              },
              {
                title: "Course Builder",
                description: "Drag-and-drop course builder with video uploads via Mux.",
              },
              {
                title: "Email Marketing",
                description: "Built-in campaigns, segments, and automation. No extra cost.",
              },
              {
                title: "AI Tools",
                description: "Generate titles, descriptions, and lesson content with Claude.",
              },
              {
                title: "Analytics",
                description: "Real-time dashboard with revenue, orders, and conversion tracking.",
              },
              {
                title: "Design Editor",
                description: "Customize your storefront theme with live preview.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="border border-zinc-200 rounded-xl p-6 hover:shadow-sm transition-shadow"
              >
                <h3 className="font-semibold text-lg text-zinc-900">{feature.title}</h3>
                <p className="mt-2 text-zinc-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}