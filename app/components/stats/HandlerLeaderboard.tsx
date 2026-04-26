"use client";

import type { HandlerStat } from "@/lib/stats/types";
import { Trophy, Medal, Crown, Shield } from "lucide-react";

interface Props {
  data: (HandlerStat & { isSupportMember?: boolean; type?: 'support' | 'admin' })[];
  onHandlerClick?: (handler: string) => void;
}

const RANK_STYLES = [
  { icon: Crown, bg: "bg-amber/15", color: "text-amber", ring: "ring-1 ring-amber/30" },
  { icon: Medal, bg: "bg-foreground/10", color: "text-text-secondary", ring: "" },
  { icon: Medal, bg: "bg-amber-dim/15", color: "text-amber-dim", ring: "" },
];

export function HandlerLeaderboard({ data, onHandlerClick }: Props) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 shrink-0">
        <Trophy className="h-4 w-4 text-amber" />
        <h3 className="text-sm font-medium text-text-secondary">
          Leaderboard
        </h3>
        <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] text-text-secondary">
          {data.length}
        </span>
      </div>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          Sin datos
        </p>
      ) : (
        <div className="space-y-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: '340px' }}>
          {data.map((h, i) => {
            const rank = RANK_STYLES[i];
            return (
              <div
                key={h.handler}
                onClick={() => onHandlerClick?.(h.handler)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all cursor-pointer hover:bg-surface-hover ${
                  i === 0 ? "bg-amber/5" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    rank ? `${rank.bg} ${rank.ring}` : "bg-surface-active"
                  }`}
                >
                  {rank ? (
                    <rank.icon className={`h-3.5 w-3.5 ${rank.color}`} />
                  ) : (
                    <span className="text-text-secondary">{i + 1}</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm ${i === 0 ? "font-semibold" : "font-medium"}`}>
                      {h.handler}
                    </p>
                    {h.type === 'support' ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[10px] text-amber">
                        <Shield className="h-3 w-3" />
                        Support
                      </span>
                    ) : h.type === 'admin' ? (
                      <span className="flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] text-green">
                        <Crown className="h-3 w-3" />
                        Admin
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-active">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber/70 to-amber transition-all duration-500"
                      style={{ width: `${h.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-bold tabular-nums">{h.ticketsHandled}</p>
                  <p className="text-[11px] text-text-secondary">{h.percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
