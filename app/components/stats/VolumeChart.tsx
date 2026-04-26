"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useDashboardStore } from "@/lib/stats/store";
import type { VolumeBucket } from "@/lib/stats/types";

interface Props {
  data: VolumeBucket[];
}

const GROUP_LABELS: Record<string, string> = {
  day: "Diario",
  week: "Semanal",
  month: "Mensual",
};

export function VolumeChart({ data }: Props) {
  const { groupBy, setGroupBy } = useDashboardStore();

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-secondary">
            Volumen de tickets
          </h3>
          <div className="flex items-center gap-3 ml-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber" />Total
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green" />Respondidos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red" />Sin responder
            </span>
          </div>
        </div>
        <div className="flex gap-0.5 rounded-lg bg-surface-active p-0.5">
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                groupBy === g
                  ? "bg-amber text-black shadow-sm"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">
          Sin datos para este período
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffac00" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ffac00" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorResponded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUnresponded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis
              dataKey="label"
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
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Total"
              stroke="#ffac00"
              fill="url(#colorCount)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="responded"
              name="Respondidos"
              stroke="#22c55e"
              fill="url(#colorResponded)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="unresponded"
              name="Sin responder"
              stroke="#ef4444"
              fill="url(#colorUnresponded)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
