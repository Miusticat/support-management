"use client";

import type { TicketRow } from "@/lib/stats/types";
import { ChevronLeft, ChevronRight, Search, X, List } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function TicketsTable({
  tickets,
  total,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <List className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-medium text-text-secondary">
            Tickets
          </h3>
          <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-medium text-text-secondary tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar usuario, personaje, consulta..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-8 text-xs text-foreground placeholder-text-secondary focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/20 transition-all"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-xs shrink-0">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 0}
                className="rounded-md p-1.5 text-text-secondary hover:bg-surface-hover disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-text-secondary tabular-nums px-1">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="rounded-md p-1.5 text-text-secondary hover:bg-surface-hover disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      {tickets.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          Sin tickets en este período
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-secondary bg-surface-active/30">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">#</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">Personaje</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">Consulta</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">Handler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-text-secondary tabular-nums">
                    {t.id}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{t.username}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{t.character}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-text-secondary">{t.request}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-text-secondary tabular-nums">
                    {t.submitted_at}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.category_name ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: (t.category_color ?? '#6b7280') + '15', color: t.category_color ?? '#6b7280' }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.category_color ?? '#6b7280' }} />
                        {t.category_name}
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.handler ? (
                      <span className="inline-flex items-center rounded-md bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
                        {t.handler}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red/10 px-2 py-0.5 text-xs font-medium text-red">
                        Sin handler
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
