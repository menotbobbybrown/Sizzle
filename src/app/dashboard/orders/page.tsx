import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Orders",
};

// ─── Status badge styling ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PAID: "bg-green-50 text-green-700 border-green-200",
    FULFILLED: "bg-blue-50 text-blue-700 border-blue-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
    REFUNDED: "bg-zinc-50 text-zinc-500 border-zinc-200",
  };

  const label = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || "bg-zinc-50 text-zinc-600 border-zinc-200"
      }`}
    >
      {label}
    </span>
  );
}

// ─── Filter tabs ───────────────────────────────────────────────────

type TabFilter = "all" | "PAID" | "FULFILLED" | "PENDING" | "REFUNDED";

function FilterTab({
  current,
  value,
  label,
  count,
}: {
  current: TabFilter;
  value: TabFilter;
  label: string;
  count?: number;
}) {
  const isActive = current === value;
  const href =
    value === "all"
      ? "/dashboard/orders"
      : `/dashboard/orders?status=${value}`;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`text-xs ${
            isActive ? "text-zinc-300" : "text-zinc-400"
          }`}
        >
          ({count})
        </span>
      )}
    </Link>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();

  // Auth guard
  if (!session?.user) {
    redirect("/login");
  }

  // Resolve workspace membership
  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  const workspace = membership.workspace;
  const { status } = await searchParams;

  // Determine status filter
  const validStatuses: OrderStatus[] = ["PAID", "FULFILLED", "PENDING", "FAILED", "REFUNDED"];
  const statusFilter = status && validStatuses.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : null;

  // Build query
  const where: Record<string, unknown> = { workspaceId: workspace.id };
  if (statusFilter) {
    where.status = statusFilter;
  }

  // Fetch orders
  const orders = await db.order.findMany({
    where,
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
      discountCode: { select: { code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Compute total revenue excluding refunded
  const totalRevenue = orders
    .filter((o) => o.status !== "REFUNDED" && o.status !== "FAILED")
    .reduce((sum, o) => sum + Number(o.amount), 0);

  // Counts for filter tabs
  const orderCounts = {
    all: orders.length,
    PAID: orders.filter((o) => o.status === "PAID").length,
    FULFILLED: orders.filter((o) => o.status === "FULFILLED").length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    REFUNDED: orders.filter((o) => o.status === "REFUNDED").length,
  };

  const currentTab: TabFilter = statusFilter
    ? (statusFilter as TabFilter)
    : "all";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
          <p className="mt-1 text-zinc-500">View and manage customer orders.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Total Revenue</p>
          <p className="text-xl font-bold text-zinc-900">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mt-6">
        <FilterTab current={currentTab} value="all" label="All" count={orderCounts.all} />
        <FilterTab current={currentTab} value="PAID" label="Paid" count={orderCounts.PAID} />
        <FilterTab current={currentTab} value="FULFILLED" label="Fulfilled" count={orderCounts.FULFILLED} />
        <FilterTab current={currentTab} value="PENDING" label="Pending" count={orderCounts.PENDING} />
        <FilterTab current={currentTab} value="REFUNDED" label="Refunded" count={orderCounts.REFUNDED} />
      </div>

      {/* Orders table */}
      <div className="mt-4 bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Items
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">
                        {order.customerName || "Guest"}
                      </div>
                      {order.customerEmail && (
                        <div className="text-xs text-zinc-500">
                          {order.customerEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-700">
                        {order.items.map((item) => item.product.name).join(", ") || "—"}
                      </div>
                      {order.discountCode && (
                        <div className="text-xs text-amber-600 mt-0.5">
                          Code: {order.discountCode.code}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-zinc-900">
                        {formatCurrency(Number(order.amount))}
                      </div>
                      <div className="text-xs text-zinc-400">{order.currency}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                      {order.affiliateCode && (
                        <div className="text-xs text-zinc-400 mt-1">
                          Ref: {order.affiliateCode}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-600">
                        {formatDate(order.createdAt)}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {order.createdAt.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-zinc-500 py-12">
              {statusFilter
                ? `No orders with status "${statusFilter.toLowerCase()}" yet.`
                : "No orders yet. Share your storefront to start selling!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
