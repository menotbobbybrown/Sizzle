"use client";

// Placeholder for Recharts integration
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type ChartProps = {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  height?: number;
};

export function RevenueChart({ data, xKey, yKey, height = 300 }: ChartProps) {
  // When recharts is installed, render:
  // <ResponsiveContainer width="100%" height={height}>
  //   <BarChart data={data}>
  //     <CartesianGrid strokeDasharray="3 3" />
  //     <XAxis dataKey={xKey} />
  //     <YAxis />
  //     <Tooltip />
  //     <Bar dataKey={yKey} fill="#000" radius={[4, 4, 0, 0]} />
  //   </BarChart>
  // </ResponsiveContainer>

  return (
    <div
      style={{ height }}
      className="flex items-center justify-center bg-zinc-50 rounded-lg"
    >
      <p className="text-sm text-zinc-400">
        Revenue chart ({data.length} data points)
      </p>
    </div>
  );
}

export function OverviewCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "Revenue", value: "$0.00" },
        { label: "Orders", value: "0" },
        { label: "Conversion", value: "0%" },
        { label: "Visitors", value: "0" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="bg-white border border-zinc-200 rounded-xl p-4"
        >
          <p className="text-sm text-zinc-500">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}