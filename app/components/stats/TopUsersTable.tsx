"use client";

import type { TopUser } from "@/lib/stats/types";
import { Users } from "lucide-react";

interface Props {
  data: TopUser[];
}

export function TopUsersTable({ data }: Props) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 shrink-0">
        <Users className="h-4 w-4 text-text-secondary" />
        <h3 className="text-sm font-medium text-text-secondary">
          Usuarios frecuentes
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
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar" style={{ maxHeight: '340px' }}>
          <table className="w-full text-sm">
            <thead className="text-left text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider">#</th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider">Usuario</th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider">Personaje</th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-right">Tickets</th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-right">Respuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map((u, i) => {
                const rate = u.ticketCount > 0
                  ? Math.round((u.respondedCount / u.ticketCount) * 100)
                  : 0;
                return (
                  <tr
                    key={`${u.username}-${u.character}-${i}`}
                    className="hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        i === 0 ? "bg-amber/15 text-amber" : "text-text-secondary"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium">{u.username}</td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">
                      {u.character}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                      {u.ticketCount}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-active">
                          <div
                            className="h-full rounded-full bg-green transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-text-secondary w-8 text-right">
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
