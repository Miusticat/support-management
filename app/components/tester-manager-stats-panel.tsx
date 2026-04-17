"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type TesterManagerMetric = {
  key: string;
  label: string;
  value: number | null;
};

type TesterManagerResponse = {
  available?: boolean;
  sourceUrl?: string;
  fetchedAt?: string;
  metrics?: TesterManagerMetric[];
  note?: string | null;
};

const REFRESH_INTERVAL_MS = 30_000;

const iconByKey: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
  inReview: Activity,
  total: Activity,
};

function formatDateTime(value: string | undefined) {
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

export function TesterManagerStatsPanel() {
  const [data, setData] = useState<TesterManagerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load(showLoading: boolean) {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/discord/tester-manager-stats", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
        });

        const payload = (await response.json()) as TesterManagerResponse;
        if (!mounted) {
          return;
        }

        if (!response.ok) {
          throw new Error("No se pudo cargar estadisticas del tester manager");
        }

        setData(payload);
        setError(null);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Error desconocido");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load(true);

    const intervalId = window.setInterval(() => {
      void load(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const metrics = useMemo(() => {
    const source = Array.isArray(data?.metrics) ? data.metrics : [];

    if (source.length > 0) {
      return source;
    }

    return [
      { key: "pending", label: "Pendientes", value: null },
      { key: "approved", label: "Aprobados", value: null },
      { key: "rejected", label: "Rechazados", value: null },
      { key: "inReview", label: "En revision", value: null },
    ];
  }, [data]);

  return (
    <UICard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-(--color-neutral-grey)/70">
            PCU Tester Manager
          </p>
          <h2 className="mt-1 text-lg font-semibold text-(--color-neutral-white)">
            Estadisticas en tiempo real
          </h2>
          <p className="mt-1 text-xs text-(--color-neutral-grey)">
            Ultima sincronizacion: {formatDateTime(data?.fetchedAt)}
          </p>
        </div>

        <span
          className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            data?.available
              ? "border-[#34d399]/35 bg-[#34d399]/10 text-[#b9f5df]"
              : "border-[#facc15]/35 bg-[#facc15]/10 text-[#ffe9a6]"
          }`}
        >
          {loading ? "Sincronizando" : data?.available ? "Conectado" : "Pendiente de acceso"}
        </span>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-[#fb7185]/35 bg-[#fb7185]/10 p-3 text-xs text-[#ffc3cd]">
          {error}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = iconByKey[metric.key] ?? Activity;

            return (
              <div key={metric.key} className="rounded-lg border border-white/10 bg-white/2 p-3">
                <div className="flex items-center gap-2 text-(--color-neutral-grey)">
                  <Icon className="h-4 w-4" />
                  <p className="text-[10px] uppercase tracking-[0.14em]">{metric.label}</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-(--color-neutral-white)">
                  {metric.value === null ? "-" : metric.value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {data?.note && (
        <p className="mt-4 text-xs text-(--color-neutral-grey)">{data.note}</p>
      )}
    </UICard>
  );
}
