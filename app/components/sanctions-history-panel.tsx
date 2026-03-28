"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Filter, Search, Shield, Users } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type SanctionItem = {
  id: string;
  fecha: string;
  supportName: string;
  supportDiscordId: string;
  adminName: string;
  requestedSanction: string;
  appliedSanction: string;
  accumulationNote: string | null;
  createdAt: Date;
};

type SanctionsHistoryPanelProps = {
  sanctions: SanctionItem[];
};

type SupportAggregate = {
  supportDiscordId: string;
  supportName: string;
  total: number;
  warnGraveOrHigher: number;
};

function sanctionBadgeClasses(sanction: string): string {
  switch (sanction) {
    case "Advertencia":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "Warn Intermedio":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "Warn Grave":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Suspension":
      return "bg-red-600/20 text-red-300 border-red-600/30";
    case "Remocion":
      return "bg-red-900/25 text-red-200 border-red-900/40";
    default:
      return "bg-white/5 text-[var(--color-neutral-grey)] border-white/10";
  }
}

function asDate(value: Date) {
  return new Date(value).toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SanctionsHistoryPanel({ sanctions }: SanctionsHistoryPanelProps) {
  const [query, setQuery] = useState("");
  const [sanctionFilter, setSanctionFilter] = useState("all");

  const sanctionKinds = useMemo(() => {
    return Array.from(new Set(sanctions.map((item) => item.appliedSanction))).sort();
  }, [sanctions]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sanctions.filter((item) => {
      const matchesText =
        normalizedQuery.length === 0 ||
        item.supportName.toLowerCase().includes(normalizedQuery) ||
        item.adminName.toLowerCase().includes(normalizedQuery) ||
        item.supportDiscordId.includes(normalizedQuery);

      const matchesSanction =
        sanctionFilter === "all" || item.appliedSanction === sanctionFilter;

      return matchesText && matchesSanction;
    });
  }, [sanctions, query, sanctionFilter]);

  const supportsRanking = useMemo(() => {
    const map = new Map<string, SupportAggregate>();

    for (const row of sanctions) {
      const current = map.get(row.supportDiscordId);
      const isGraveOrHigher = ["Warn Grave", "Suspension", "Remocion"].includes(row.appliedSanction);

      if (!current) {
        map.set(row.supportDiscordId, {
          supportDiscordId: row.supportDiscordId,
          supportName: row.supportName,
          total: 1,
          warnGraveOrHigher: isGraveOrHigher ? 1 : 0,
        });
        continue;
      }

      current.total += 1;
      if (isGraveOrHigher) {
        current.warnGraveOrHigher += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }

      return b.warnGraveOrHigher - a.warnGraveOrHigher;
    });
  }, [sanctions]);

  const reincidentes = useMemo(
    () => supportsRanking.filter((item) => item.total >= 2),
    [supportsRanking]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UICard className="p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.05]">
              <Shield className="h-3.5 w-3.5 text-[var(--color-neutral-grey)]" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/60">Total sanciones</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-neutral-white)]">{sanctions.length}</p>
        </UICard>

        <UICard className="p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.05]">
              <Users className="h-3.5 w-3.5 text-[var(--color-neutral-grey)]" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/60">Supports sancionados</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-neutral-white)]">{supportsRanking.length}</p>
        </UICard>

        <UICard className="p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-accent-orange)]/10">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-accent-orange)]" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/60">Reincidentes</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-accent-orange)]">{reincidentes.length}</p>
        </UICard>

        <UICard className="p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.05]">
              <Filter className="h-3.5 w-3.5 text-[var(--color-neutral-grey)]" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/60">En vista filtrada</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-accent-blue)]">{filtered.length}</p>
        </UICard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <UICard className="xl:col-span-8 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-neutral-white)]">Consulta de sanciones</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-neutral-grey)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por support, admin o ID"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)] sm:w-72"
                />
              </label>

              <select
                value={sanctionFilter}
                onChange={(e) => setSanctionFilter(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#ffac00]/40"
                style={{ colorScheme: "dark" }}
              >
                <option value="all">Todas las sanciones</option>
                {sanctionKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 border-b border-white/[0.06] bg-[#141414] text-[var(--color-neutral-grey)]">
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">Fecha</th>
                  <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">Support</th>
                  <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">Admin</th>
                  <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">Solicitada</th>
                  <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">Final</th>
                  <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">Nota de acumulación</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{asDate(row.createdAt)}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-white)]">{row.supportName}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{row.adminName}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${sanctionBadgeClasses(row.requestedSanction)}`}>{row.requestedSanction}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${sanctionBadgeClasses(row.appliedSanction)}`}>{row.appliedSanction}</span>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{row.accumulationNote ?? "-"}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center">
                      <Search className="mx-auto mb-3 h-8 w-8 text-[var(--color-neutral-grey)]/30" />
                      <p className="text-sm text-[var(--color-neutral-grey)]">No hay sanciones para el filtro actual.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </UICard>

        <UICard className="xl:col-span-4 p-5">
          <h2 className="text-lg font-semibold text-[var(--color-neutral-white)]">Top reincidencias</h2>
          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
            Supports con mayor cantidad de sanciones para seguimiento prioritario.
          </p>

          <div className="mt-4 space-y-2">
            {supportsRanking.slice(0, 10).map((item, index) => (
              <div
                key={item.supportDiscordId}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--color-neutral-white)]">
                    <span className="text-[var(--color-neutral-grey)]">#{index + 1}</span> {item.supportName}
                  </p>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs font-bold text-[var(--color-neutral-white)]">{item.total}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[var(--color-accent-red)]" style={{ width: `${Math.min(100, (item.warnGraveOrHigher / Math.max(item.total, 1)) * 100)}%` }} />
                  </div>
                  <p className="whitespace-nowrap text-[10px] text-[var(--color-neutral-grey)]">
                    {item.warnGraveOrHigher} grave+
                  </p>
                </div>
              </div>
            ))}

            {supportsRanking.length === 0 ? (
              <p className="text-sm text-[var(--color-neutral-grey)]">No hay sanciones registradas todavia.</p>
            ) : null}
          </div>
        </UICard>
      </div>
    </div>
  );
}
