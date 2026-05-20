import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-zinc-200 bg-white hidden md:flex flex-col">
        <div className="p-4 border-b border-zinc-100">
          <Link href="/dashboard" className="text-lg font-bold text-zinc-900">
            Sizzle
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem href="/dashboard" label="Overview" icon="📊" />
          <NavItem href="/dashboard/analytics" label="Analytics" icon="📈" />
          <NavItem href="/dashboard/products" label="Products" icon="📦" />
          <NavItem href="/dashboard/orders" label="Orders" icon="🛍️" />
          <NavItem href="/dashboard/courses" label="Courses" icon="🎓" />
          <NavItem href="/dashboard/design" label="Design" icon="🎨" />
          <NavItem href="/dashboard/campaigns" label="Campaigns" icon="📧" />
          <NavItem href="/dashboard/subscribers" label="Subscribers" icon="👥" />
          <NavItem href="/dashboard/ai" label="AI Tools" icon="🤖" />
          <NavItem href="/dashboard/billing" label="Billing" icon="💳" />
          <NavItem href="/dashboard/settings" label="Settings" icon="⚙️" />
        </nav>
      </aside>
      <main className="flex-1 bg-zinc-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}