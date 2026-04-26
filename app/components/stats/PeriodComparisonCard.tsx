"use client";

import type { PeriodComparison } from "@/lib/stats/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  data: PeriodComparison | null;
}

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="flex items-center gap-1 text-xs text-green">
        <TrendingUp className="h-3 w-3" />+{value}%
      </span>
    );
  if (value < 0)
    return (
      <span className="flex items-center gap-1 text-xs text-red">
        <TrendingDown className="h-3 w-3" />
        {value}%
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-text-secondary">
      <Minus className="h-3 w-3" />
      0%
    </span>
  );
}

export function PeriodComparisonCard({ data }: Props) {
  if (!data) return null;

  const metrics = [
    {
      label: "Total Tickets",
      current: data.current.total,
      previous: data.previous.total,
      change: data.changes.total,
    },
    {
      label: "Respondidos",
      current: data.current.responded,
      previous: data.previous.responded,
      change: data.changes.responded,
    },
    {
      label: "Handlers Activos",
      current: data.current.handlers,
      previous: data.previous.handlers,
      change: data.changes.handlers,
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-4 text-sm font-medium text-text-secondary">
        Comparativa vs Período Anterior
      </h3>
      <div className="grid flex-1 grid-cols-3 gap-4 content-center">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1">
            <p className="text-xs text-text-secondary">{m.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{m.current}</span>
              <span className="text-xs text-text-secondary">
                vs {m.previous}
              </span>
            </div>
            <ChangeIndicator value={m.change} />
          </div>
        ))}
      </div>
    </div>
  );
}
