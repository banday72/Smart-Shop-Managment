"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function SalesChart({ data }: { data: { label: string; amount: number }[] }) {
  const rows = data.length ? data : [{ label: "—", amount: 0 }];

  return (
    <div className="mt-6 h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#eef1f6" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} width={92} />
          <Tooltip
            cursor={{ fill: "rgba(214, 168, 79, 0.08)" }}
            formatter={(value) => [formatCurrency(Number(value)), "Sales"]}
            contentStyle={{ borderRadius: 14, border: "1px solid #e5eaf1", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
          />
          <Bar dataKey="amount" fill="#0b1220" radius={[8, 8, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
