import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RevenueChart } from "@/components/charts/revenue-chart";

export const metadata: Metadata = {
  title: "Dashboard",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function calculateChange(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) {
    return { value: current > 0 ? "+100%" : "0%", positive: current > 0 };
  }
  const change = ((current - previous) / previous) * 100;
  const formatted = change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
  return { value: formatted, positive: change >= 0 };
}

export default async function DashboardPage() {
  const session = await auth();

  // Auth guard - redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Get user's workspace from membership
  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  // Redirect to onboarding if no workspace
  if (!membership) {
    redirect("/onboarding");
  }

  const workspace = membership.workspace;

  // Calculate date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Query recent paid/fulfilled orders (30 days)
  const recentOrders = await db.order.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ["PAID", "FULFILLED"] },
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      items: {
        include: { product: { select: { name: true, imageUrl: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Calculate revenue stats
  const currentRevenue = recentOrders.reduce((sum, order) => sum + Number(order.amount), 0);

  // Get previous period orders for comparison
  const previousOrders = await db.order.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ["PAID", "FULFILLED"] },
      createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
  });

  const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.amount), 0);
  const revenueChange = calculateChange(currentRevenue, previousRevenue);

  // Get analytics daily data for chart (last 30 days)
  const analyticsData = await db.analyticsDaily.findMany({
    where: {
      workspaceId: workspace.id,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      netRevenue: true,
      orderCount: true,
    },
  });

  // Transform for chart
  const chartData = analyticsData.map((day) => ({
    date: day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Number(day.netRevenue),
    orders: day.orderCount,
  }));

  // Count products
  const productCount = await db.product.count({
    where: { workspaceId: workspace.id },
  });

  // Count subscribers
  const subscriberCount = await db.subscriber.count({
    where: { workspaceId: workspace.id, status: "ACTIVE" },
  });

  // Get unread notifications count
  const unreadNotifications = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  // Orders count and change
  const orderCount = recentOrders.length;
  const previousOrderCount = previousOrders.length;
  const orderChange = calculateChange(orderCount, previousOrderCount);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome back! Here&apos;s what&apos;s happening with {workspace.name}.
          </p>
        </div>
        {unreadNotifications > 0 && (
          <Link
            href="/dashboard/notifications"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-full border border-amber-200 hover:bg-amber-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadNotifications} new notification{unreadNotifications > 1 ? "s" : ""}
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Revenue (30d)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{formatCurrency(currentRevenue)}</p>
          <p className={`text-xs mt-1 ${revenueChange.positive ? "text-green-600" : "text-red-600"}`}>
            {revenueChange.value} from previous period
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Orders (30d)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{formatNumber(orderCount)}</p>
          <p className={`text-xs mt-1 ${orderChange.positive ? "text-green-600" : "text-red-600"}`}>
            {orderChange.value} from previous period
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Products</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{formatNumber(productCount)}</p>
          <Link href="/dashboard/products" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            View all products
          </Link>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Subscribers</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{formatNumber(subscriberCount)}</p>
          <Link href="/dashboard/subscribers" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            Manage subscribers
          </Link>
        </div>
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 ? (
        <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900">Revenue Over Time</h2>
          <div className="mt-4">
            <RevenueChart data={chartData} xKey="date" yKey="revenue" />
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900">Quick actions</h2>
          <div className="mt-4 space-y-3">
            <Link
              href="/dashboard/products/new"
              className="flex items-center gap-3 w-full px-4 py-3 border border-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create a product
            </Link>
            <Link
              href="/dashboard/courses"
              className="flex items-center gap-3 w-full px-4 py-3 border border-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Build a course
            </Link>
            <Link
              href="/dashboard/design"
              className="flex items-center gap-3 w-full px-4 py-3 border border-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Customize storefront
            </Link>
            <Link
              href={`/${workspace.handle}`}
              target="_blank"
              className="flex items-center gap-3 w-full px-4 py-3 border border-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View storefront
              <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Recent orders</h2>
            <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {order.customerName || order.customerEmail || "Guest"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {order.items.map((item) => item.product.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-zinc-900">{formatCurrency(Number(order.amount))}</p>
                    <p className="text-xs text-zinc-500">
                      {order.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              No orders yet. Share your storefront to start selling!
            </p>
          )}
        </div>
      </div>

      {/* Storefront Link Banner */}
      {workspace.handle && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-blue-900">Your storefront is live!</h2>
              <p className="mt-1 text-sm text-blue-700">
                Share your link to start accepting orders
              </p>
            </div>
            <div className="flex items-center gap-3">
              <code className="px-4 py-2 bg-white border border-blue-200 rounded-lg text-blue-900 font-mono text-sm">
                sizzle.so/@{workspace.handle}
              </code>
              <Link
                href={`/${workspace.handle}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Open
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}