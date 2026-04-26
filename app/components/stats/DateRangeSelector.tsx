"use client";

import { useDashboardStore, type Preset } from "@/lib/stats/store";
import { cn } from "@/lib/stats/utils";
import { Calendar } from "lucide-react";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7days", label: "7 días" },
  { value: "30days", label: "30 días" },
  { value: "month", label: "Este mes" },
  { value: "all", label: "Todo" },
];

export function DateRangeSelector() {
  const { preset, from, to, setPreset, setCustomRange } = useDashboardStore();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="h-4 w-4 text-text-secondary" />
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPreset(p.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            preset === p.value
              ? "bg-amber text-black"
              : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
      <span className="mx-1 text-text-secondary/50">|</span>
      <input
        type="date"
        value={from}
        onChange={(e) => setCustomRange(e.target.value, to)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
      />
      <span className="text-xs text-text-secondary">a</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setCustomRange(from, e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
      />
    </div>
  );
}
