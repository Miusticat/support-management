"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type PostulacionesResponse = {
  headers?: string[];
  rows?: string[][];
  fetchedAt?: string;
  error?: string;
};

const REFRESH_INTERVAL_MS = 15_000;

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function PostulacionesPanel() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  async function loadPostulaciones(showRefreshingState: boolean) {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/discord/postulaciones", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as PostulacionesResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la hoja de postulaciones");
      }

      setHeaders(Array.isArray(data.headers) ? data.headers : []);
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLastSyncAt(data.fetchedAt ?? new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPostulaciones(false);

    const intervalId = window.setInterval(() => {
      loadPostulaciones(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const tableHeaders = useMemo(() => {
    if (headers.length > 0) {
      return headers;
    }

    if (rows.length > 0) {
      return rows[0].map((_, idx) => `Columna ${idx + 1}`);
    }

    return [];
  }, [headers, rows]);

  if (loading) {
    return (
      <UICard className="col-span-full">
        <div className="flex items-center justify-center py-16 text-sm text-[var(--color-neutral-grey)]">
          Cargando postulaciones...
        </div>
      </UICard>
    );
  }

  if (error) {
    return (
      <UICard className="col-span-full border-[#fb7185]/35 bg-[#fb7185]/12">
        <div className="space-y-3 py-8 text-sm text-[#ffc3cd]">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadPostulaciones(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#fb7185]/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd5dd] transition-colors hover:bg-[#fb7185]/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      </UICard>
    );
  }

  return (
    <UICard className="col-span-full overflow-hidden px-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/80">
            Postulaciones en tiempo real
          </p>
          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
            Última sincronización: {formatDateTime(lastSyncAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPostulaciones(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-white)] transition-colors hover:bg-white/[0.08]"
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando" : "Actualizar"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-[var(--color-neutral-grey)]">
          No hay respuestas registradas todavía.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                {tableHeaders.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join("|")}`} className="border-b border-white/[0.05] last:border-b-0">
                  {tableHeaders.map((_, columnIndex) => (
                    <td
                      key={`${rowIndex}-${columnIndex}`}
                      className="max-w-[24rem] px-4 py-2.5 align-top text-[13px] text-[var(--color-neutral-white)]"
                    >
                      <span className="line-clamp-3 whitespace-pre-wrap break-words">{row[columnIndex] ?? ""}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </UICard>
  );
}
