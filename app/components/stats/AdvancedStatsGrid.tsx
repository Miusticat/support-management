"use client";

import type { AdvancedStats } from "@/lib/stats/types";
import {
  Clock,
  CalendarDays,
  Users,
  BarChart3,
  UserCheck,
} from "lucide-react";

interface Props {
  stats: AdvancedStats | null;
}

export function AdvancedStatsGrid({ stats }: Props) {
  if (!stats) return null;

  const items = [
    {
      icon: BarChart3,
      label: "Promedio diario",
      value: String(stats.avgTicketsPerDay),
      sub: "tickets / día",
      accent: "text-amber",
    },
    {
      icon: Clock,
      label: "Hora pico",
      value: `${String(stats.peakHour).padStart(2, "0")}:00 - ${String((stats.peakHour + 1) % 24).padStart(2, "0")}:00`,
      sub: `${stats.peakHourCount} tickets`,
      accent: "text-amber",
    },
    {
      icon: CalendarDays,
      label: "Día más activo",
      value: stats.busiestDay,
      sub: `${stats.busiestDayCount} tickets`,
      accent: "text-green",
    },
    {
      icon: Users,
      label: "Usuarios únicos",
      value: String(stats.uniqueUsers),
      sub: "personas",
      accent: "text-foreground",
    },
    {
      icon: UserCheck,
      label: "Promedio / Handler",
      value: String(stats.avgPerHandler),
      sub: "tickets c/u",
      accent: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex items-center gap-1.5 text-text-secondary">
            <item.icon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <p className={`mt-2 text-xl font-bold ${item.accent}`}>{item.value}</p>
          <p className="mt-0.5 text-xs text-text-secondary">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}
