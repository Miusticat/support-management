"use client";

import type { HandlerHourly } from "@/lib/stats/types";
import { Grid3X3 } from "lucide-react";

interface Props {
  data: HandlerHourly[];
}

export function HandlerHeatmap({ data }: Props) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-medium text-text-secondary">
            Actividad por hora
          </h3>
        </div>
        <p className="py-6 text-center text-sm text-text-secondary">
          Sin datos
        </p>
      </div>
    );
  }

  const maxVal = Math.max(...data.flatMap((d) => d.hours));

  const getCellStyle = (value: number): string => {
    if (value === 0) return "bg-surface-active/50";
    const intensity = value / maxVal;
    if (intensity > 0.75) return "bg-amber shadow-sm shadow-amber/20";
    if (intensity > 0.5) return "bg-amber/70";
    if (intensity > 0.25) return "bg-amber/40";
    return "bg-amber/20";
  };

  const activeHours = new Set<number>();
  for (const d of data) {
    d.hours.forEach((v, i) => {
      if (v > 0) activeHours.add(i);
    });
  }
  const hours = Array.from(activeHours).sort((a, b) => a - b);
  const displayHours = hours.length > 0 ? hours : Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-medium text-text-secondary">
            Actividad por hora
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
          <span>Menos</span>
          <div className="flex gap-0.5">
            <div className="h-2.5 w-2.5 rounded-[3px] bg-surface-active/50" />
            <div className="h-2.5 w-2.5 rounded-[3px] bg-amber/20" />
            <div className="h-2.5 w-2.5 rounded-[3px] bg-amber/40" />
            <div className="h-2.5 w-2.5 rounded-[3px] bg-amber/70" />
            <div className="h-2.5 w-2.5 rounded-[3px] bg-amber" />
          </div>
          <span>Más</span>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
        <table className="text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                Handler
              </th>
              {displayHours.map((h) => (
                <th
                  key={h}
                  className="px-0.5 py-1.5 text-center text-[10px] font-medium text-text-secondary"
                >
                  {String(h).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.handler} className="group">
                <td className="sticky left-0 bg-surface whitespace-nowrap px-2 py-0.5 font-medium group-hover:text-amber transition-colors">
                  {row.handler}
                </td>
                {displayHours.map((h) => (
                  <td key={h} className="px-0.5 py-0.5">
                    <div
                      className={`mx-auto h-6 w-6 rounded-[4px] ${getCellStyle(
                        row.hours[h]
                      )} flex items-center justify-center transition-transform hover:scale-110`}
                      title={`${row.handler} @ ${String(h).padStart(2, "0")}:00 — ${row.hours[h]} tickets`}
                    >
                      {row.hours[h] > 0 && (
                        <span className="text-[9px] font-bold text-black/80">
                          {row.hours[h]}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
