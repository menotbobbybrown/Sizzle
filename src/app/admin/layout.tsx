import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * The admin console is platform-level and must never render for a
 * non-administrator. We enforce that here, in the layout, so every page under
 * `/admin/*` inherits the guard — there is no per-page opt-in to forget.
 *
 * An unauthenticated visitor is sent to sign in (with a callback back to the
 * page they wanted); an authenticated non-admin is bounced to their dashboard
 * rather than shown a 403, so we never confirm the console exists to them.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-zinc-200 bg-zinc-900 text-white flex flex-col">
        <div className="p-4 border-b border-zinc-700">
          <span className="text-lg font-bold">Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/admin" className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
            Overview
          </a>
          <a href="/admin/users" className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
            Users
          </a>
          <a href="/admin/stores" className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
            Stores
          </a>
          <a href="/admin/orders" className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
            Orders
          </a>
          <a href="/admin/disputes" className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
            Disputes
          </a>
          <a href="/admin/webhooks" className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
            Webhooks
          </a>
        </nav>
        <div className="p-4 border-t border-zinc-700">
          <a href="/dashboard" className="text-sm text-zinc-400 hover:text-white">
            &larr; Back to dashboard
          </a>
        </div>
      </aside>
      <main className="flex-1 bg-zinc-50 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
}