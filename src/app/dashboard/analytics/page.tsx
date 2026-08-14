"use client";

import { Loader2, TrendingUp, UsersRound } from "lucide-react";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { productPriceLabel } from "@/lib/product-form";
import { api } from "@/trpc/react";

export default function AnalyticsPage() {
  const overview = api.analytics.getOverview.useQuery();
  const topProducts = api.analytics.getTopProducts.useQuery();

  if (overview.isLoading || topProducts.isLoading) {
    return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;
  }

  if (overview.error || topProducts.error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{overview.error?.message ?? topProducts.error?.message}</div>;
  }

  const data = overview.data;
  if (!data) return null;
  const chartData = data.dailyAnalytics.map((day) => ({ date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: Number(day.netRevenue), orders: day.orderCount }));
  const visitorTotal = data.dailyAnalytics.reduce((total, day) => total + day.visitorCount, 0);
  const averageConversion = data.dailyAnalytics.length ? data.dailyAnalytics.reduce((total, day) => total + Number(day.conversionRate), 0) / data.dailyAnalytics.length : 0;

  return (
    <div className="space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Live workspace data</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Analytics</h1><p className="mt-2 text-sm text-zinc-500">Your revenue, sales, conversion, and product performance are loaded from the active Sizzle workspace.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Revenue" value={productPriceLabel(data.totalRevenue)} detail="Workspace total" /><Metric label="Paid orders" value={String(data.orderCount)} detail="Last 30 days" /><Metric label="Visitors" value={String(visitorTotal)} detail="Last 30 days" icon={<UsersRound className="h-4 w-4" />} /><Metric label="Average conversion" value={`${averageConversion.toFixed(1)}%`} detail="Across recorded days" icon={<TrendingUp className="h-4 w-4" />} /></div>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"><div><h2 className="font-semibold text-zinc-900">Net revenue</h2><p className="mt-1 text-sm text-zinc-500">Daily activity recorded in the previous 30 days.</p></div><span className="text-xs font-medium text-zinc-500">{chartData.length} recorded day{chartData.length === 1 ? "" : "s"}</span></div><div className="mt-5"><RevenueChart data={chartData} height={320} /></div></section>
      <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"><h2 className="font-semibold text-zinc-900">Top products</h2>{topProducts.data?.length ? <div className="mt-4 divide-y divide-zinc-100">{topProducts.data.map((product, index) => <div key={product.id} className="flex min-w-0 items-center gap-3 py-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-900">{product.name}</p><p className="mt-1 text-xs text-zinc-500">{product.orders} order{product.orders === 1 ? "" : "s"}</p></div><p className="text-sm font-semibold text-zinc-900">{productPriceLabel(product.revenue)}</p></div>)}</div> : <EmptyCopy copy="No paid product sales have been recorded yet." />}</section><section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"><h2 className="font-semibold text-zinc-900">Recent paid orders</h2>{data.orders.length ? <div className="mt-4 divide-y divide-zinc-100">{data.orders.slice(0, 6).map((order) => <div key={order.id} className="flex min-w-0 items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-900">{order.customerName ?? order.customerEmail ?? "Guest customer"}</p><p className="mt-1 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><p className="shrink-0 text-sm font-semibold text-zinc-900">{productPriceLabel(order.amount, order.currency)}</p></div>)}</div> : <EmptyCopy copy="No paid or fulfilled orders have been recorded in the last 30 days." />}</section></div>
    </div>
  );
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: React.ReactNode }) {
  return <article className="rounded-xl border border-zinc-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm text-zinc-500">{label}</p>{icon ? <span className="text-zinc-400">{icon}</span> : null}</div><p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></article>;
}

function EmptyCopy({ copy }: { copy: string }) {
  return <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">{copy}</p>;
}
