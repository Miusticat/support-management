"use client";

import type { OverviewStats } from "@/lib/stats/types";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  stats: OverviewStats | null;
}

const COLORS = ["#22c55e", "#ef4444"];

export function ResponseDonut({ stats }: Props) {
  if (!stats || stats.totalTickets === 0) return null;

  const data = [
    { name: "Respondidos", value: stats.respondedTickets },
    { name: "Sin responder", value: stats.unrespondedTickets },
  ];

  const rateColor =
    stats.responseRate >= 90
      ? "text-green"
      : stats.responseRate >= 70
        ? "text-amber"
        : "text-red";

  const rateBg =
    stats.responseRate >= 90
      ? "bg-green/10"
      : stats.responseRate >= 70
        ? "bg-amber/10"
        : "bg-red/10";

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-6">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={40}
                  outerRadius={58}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={800}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${rateColor}`}>
                {stats.responseRate}%
              </span>
              <span className="text-[10px] text-text-secondary">respuesta</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green" />
                <span className="text-sm text-text-secondary">Respondidos</span>
              </div>
              <p className="ml-[18px] text-xl font-bold text-green">
                {stats.respondedTickets.toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red" />
                <span className="text-sm text-text-secondary">Sin responder</span>
              </div>
              <p className="ml-[18px] text-xl font-bold text-red">
                {stats.unrespondedTickets.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-right">
          <div className={`rounded-xl ${rateBg} px-5 py-3 text-center`}>
            <p className={`text-lg font-bold ${rateColor}`}>
              {stats.responseRate >= 90
                ? "Excelente"
                : stats.responseRate >= 70
                  ? "Buena"
                  : "Necesita mejora"}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">Tasa de respuesta</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-background/50 border border-border/50 px-3 py-2 text-center">
              <p className="text-sm font-bold tabular-nums">{stats.totalTickets.toLocaleString()}</p>
              <p className="text-[10px] text-text-secondary">Total</p>
            </div>
            <div className="rounded-lg bg-background/50 border border-border/50 px-3 py-2 text-center">
              <p className="text-sm font-bold tabular-nums">{stats.uniqueHandlers}</p>
              <p className="text-[10px] text-text-secondary">Handlers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
