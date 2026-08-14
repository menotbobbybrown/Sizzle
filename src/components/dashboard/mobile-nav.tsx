"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navigation = [
  ["/dashboard", "Overview", "📊"],
  ["/dashboard/analytics", "Analytics", "📈"],
  ["/dashboard/products", "Products", "📦"],
  ["/dashboard/orders", "Orders", "🛍️"],
  ["/dashboard/courses", "Courses", "🎓"],
  ["/dashboard/design", "Design", "🎨"],
  ["/dashboard/campaigns", "Campaigns", "📧"],
  ["/dashboard/subscribers", "Subscribers", "👥"],
  ["/dashboard/ai", "AI Tools", "🤖"],
  ["/dashboard/billing", "Billing", "💳"],
  ["/dashboard/settings", "Settings", "⚙️"],
] as const;

export function MobileDashboardNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center justify-between"><Link href="/dashboard" className="text-lg font-bold text-zinc-900 no-underline">Sizzle</Link><button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700" aria-label="Open dashboard navigation"><Menu className="h-5 w-5" /></button></div>
      {open ? <><button type="button" aria-label="Close dashboard navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-zinc-900/20" /><aside className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,calc(100vw-24px))] flex-col bg-white p-5 shadow-2xl"><div className="flex items-center justify-between border-b border-zinc-100 pb-4"><Link href="/dashboard" onClick={() => setOpen(false)} className="text-lg font-bold text-zinc-900 no-underline">Sizzle</Link><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700" aria-label="Close dashboard navigation"><X className="h-5 w-5" /></button></div><nav className="mt-4 flex-1 space-y-1 overflow-y-auto">{navigation.map(([href, label, icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 no-underline hover:bg-zinc-100 hover:text-zinc-900"><span>{icon}</span>{label}</Link>)}</nav></aside></> : null}
    </div>
  );
}
