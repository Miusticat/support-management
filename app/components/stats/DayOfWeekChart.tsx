"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { DayOfWeekBucket } from "@/lib/stats/types";
import { CalendarDays } from "lucide-react";

interface Props {
  data: DayOfWeekBucket[];
}

export function DayOfWeekChart({ data }: Props) {
  if (!data.length) return null;

  const peak = data.reduce((a, b) => (b.count > a.count ? b : a));

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 shrink-0">
        <CalendarDays className="h-4 w-4 text-text-secondary" />
        <h3 className="text-sm font-medium text-text-secondary">
          Tickets por día
        </h3>
        <span className="ml-auto rounded-md bg-green/10 px-2 py-0.5 text-[10px] font-medium text-green">
          Top: {peak.dayName}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250} className="flex-1 min-h-0">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
          <XAxis
            dataKey="dayName"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 10,
              fontSize: 12,
              padding: "8px 12px",
            }}
            labelStyle={{ color: "#9ca3af", marginBottom: 4 }}
            formatter={(value) => [`${value} tickets`, ""]}
            cursor={{ fill: "rgba(34,197,94,0.06)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.dayName === peak.dayName ? "#22c55e" : "#22c55eaa"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
