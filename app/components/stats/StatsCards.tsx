"use client";

import type { OverviewStats } from "@/lib/stats/types";
import { Ticket, CheckCircle, XCircle, TrendingUp, Users } from "lucide-react";

interface Props {
  stats: OverviewStats | null;
}

const CARDS = [
  {
    key: "totalTickets" as const,
    label: "Total tickets",
    icon: Ticket,
    gradient: "from-amber/20 to-amber/5",
    iconBg: "bg-amber/15",
    iconColor: "text-amber",
    valueColor: "text-foreground",
  },
  {
    key: "respondedTickets" as const,
    label: "Respondidos",
    icon: CheckCircle,
    gradient: "from-green/20 to-green/5",
    iconBg: "bg-green/15",
    iconColor: "text-green",
    valueColor: "text-green",
  },
  {
    key: "unrespondedTickets" as const,
    label: "Sin responder",
    icon: XCircle,
    gradient: "from-red/20 to-red/5",
    iconBg: "bg-red/15",
    iconColor: "text-red",
    valueColor: "text-red",
  },
  {
    key: "responseRate" as const,
    label: "Tasa de respuesta",
    icon: TrendingUp,
    gradient: "from-amber/20 to-amber/5",
    iconBg: "bg-amber/15",
    iconColor: "text-amber",
    valueColor: "text-foreground",
    suffix: "%",
  },
  {
    key: "uniqueHandlers" as const,
    label: "Handlers activos",
    icon: Users,
    gradient: "from-foreground/10 to-foreground/5",
    iconBg: "bg-foreground/10",
    iconColor: "text-foreground",
    valueColor: "text-foreground",
  },
];

export function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => {
        const value = stats ? stats[card.key] : null;
        const displayValue = value !== null ? `${value}${"suffix" in card ? card.suffix : ""}` : "—";

        return (
          <div
            key={card.key}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all hover:border-border/80 hover:shadow-lg hover:shadow-black/20"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                  {card.label}
                </span>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                </div>
              </div>
              <p className={`mt-3 text-3xl font-bold tracking-tight ${card.valueColor}`}>
                {displayValue}
              </p>
              {stats && card.key === "responseRate" && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      stats.responseRate >= 80
                        ? "bg-gradient-to-r from-green/80 to-green"
                        : stats.responseRate >= 50
                          ? "bg-gradient-to-r from-amber/80 to-amber"
                          : "bg-gradient-to-r from-red/80 to-red"
                    }`}
                    style={{ width: `${Math.min(stats.responseRate, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
