"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { HourlyBucket } from "@/lib/stats/types";
import { Clock } from "lucide-react";

interface Props {
  data: HourlyBucket[];
}

export function HourlyChart({ data }: Props) {
  if (!data.length) return null;

  const peak = data.reduce((a, b) => (b.count > a.count ? b : a));

  const formatted = data.map((d) => ({
    ...d,
    label: `${String(d.hour).padStart(2, "0")}:00`,
    fill: d.hour === peak.hour ? "#ffac00" : "#ffac00aa",
  }));

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 shrink-0">
        <Clock className="h-4 w-4 text-text-secondary" />
        <h3 className="text-sm font-medium text-text-secondary">
          Distribución por hora
        </h3>
        <span className="ml-auto rounded-md bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">
          Pico: {String(peak.hour).padStart(2, "0")}:00
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250} className="flex-1 min-h-0">
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={1}
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
            formatter={(value) => [
              `${value} ticket${value !== 1 ? "s" : ""}`,
              "",
            ]}
            cursor={{ fill: "rgba(255,172,0,0.06)" }}
          />
          <Bar dataKey="count" fill="#ffac00" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
