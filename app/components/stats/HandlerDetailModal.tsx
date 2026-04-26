"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Clock, Calendar, User, Tags } from "lucide-react";
import type { HandlerDetail } from "@/lib/stats/db/queries";

interface Props {
  handler: string;
  from: string;
  to: string;
  onClose: () => void;
}

export function HandlerDetailModal({ handler, from, to, onClose }: Props) {
  const [data, setData] = useState<HandlerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/stats/handler-detail?handler=${encodeURIComponent(handler)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [handler, from, to]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const maxHourly = data ? Math.max(...data.hourly.map((h) => h.count), 1) : 1;
  const maxWeekday = data ? Math.max(...data.weekday.map((d) => d.count), 1) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{handler}</h2>
            <p className="text-xs text-text-secondary">
              {from} → {to}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          </div>
        ) : data ? (
          <div className="space-y-5 p-5">
            {/* Summary */}
            <div className="rounded-lg bg-background/50 px-4 py-3 text-center">
              <p className="text-3xl font-bold text-amber">
                {data.totalTickets}
              </p>
              <p className="text-xs text-text-secondary">
                Tickets atendidos
              </p>
            </div>

            {/* Categories handled */}
            {data.categories && data.categories.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <Tags className="h-3.5 w-3.5" /> Categorías atendidas
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.categories.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                      style={{ backgroundColor: (c.color ?? '#6b7280') + '15', color: c.color ?? '#6b7280' }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color ?? '#6b7280' }} />
                      {c.name}
                      <span className="ml-0.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold">{c.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly mini chart */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Clock className="h-3.5 w-3.5" /> Actividad por hora
              </div>
              <div className="flex items-end gap-[2px] h-20">
                {Array.from({ length: 24 }, (_, h) => {
                  const entry = data.hourly.find((e) => e.hour === h);
                  const count = entry?.count ?? 0;
                  const pct = (count / maxHourly) * 100;
                  return (
                    <div
                      key={h}
                      className="flex-1 rounded-t bg-amber/70 transition-all hover:bg-amber"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${String(h).padStart(2, "0")}:00 — ${count} tickets`}
                    />
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-text-secondary">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </div>

            {/* Weekday */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Calendar className="h-3.5 w-3.5" /> Actividad por día
              </div>
              <div className="space-y-1">
                {data.weekday.map((d) => (
                  <div key={d.day} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-text-secondary">
                      {d.dayName}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-surface-active overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber/70"
                        style={{
                          width: `${(d.count / maxWeekday) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 text-right font-medium">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top users */}
            {data.topUsers.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <User className="h-3.5 w-3.5" /> Usuarios atendidos
                  frecuentemente
                </div>
                <div className="space-y-1">
                  {data.topUsers.map((u) => (
                    <div
                      key={u.username}
                      className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-surface-hover"
                    >
                      <span>{u.username}</span>
                      <span className="text-text-secondary">
                        {u.count} tickets
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent tickets */}
            {data.recentTickets.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-text-secondary">
                  Últimos tickets atendidos
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-text-secondary">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">#</th>
                        <th className="px-2 py-1 text-left font-medium">
                          Usuario
                        </th>
                        <th className="px-2 py-1 text-left font-medium">
                          Consulta
                        </th>
                        <th className="px-2 py-1 text-left font-medium">
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.recentTickets.map((t) => (
                        <tr key={t.id} className="hover:bg-surface-hover">
                          <td className="px-2 py-1 font-mono text-text-secondary">
                            {t.id}
                          </td>
                          <td className="px-2 py-1">{t.username}</td>
                          <td className="max-w-[200px] truncate px-2 py-1">
                            {t.request}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1 text-text-secondary">
                            {t.submitted_at}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-text-secondary">
            Error cargando datos
          </p>
        )}
      </div>
    </div>
  );
}
