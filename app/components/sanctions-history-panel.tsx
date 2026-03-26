"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Total sanciones</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{sanctions.length}</p>
        </UICard>

        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Supports sancionados</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{supportsRanking.length}</p>
        </UICard>

        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Reincidentes</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-accent-orange)]">{reincidentes.length}</p>
        </UICard>

        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">En vista filtrada</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-accent-blue)]">{filtered.length}</p>
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
                  className="w-full rounded-xl border border-white/10 bg-[#0f1426] py-2 pl-9 pr-3 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[var(--color-primary)]/60 sm:w-72"
                />
              </label>

              <select
                value={sanctionFilter}
                onChange={(e) => setSanctionFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0f1426] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[var(--color-primary)]/60"
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

          <div className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[#11182f] text-[var(--color-neutral-grey)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Support</th>
                  <th className="px-3 py-2 font-medium">Admin</th>
                  <th className="px-3 py-2 font-medium">Solicitada</th>
                  <th className="px-3 py-2 font-medium">Final</th>
                  <th className="px-3 py-2 font-medium">Nota de acumulacion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{asDate(row.createdAt)}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-white)]">{row.supportName}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{row.adminName}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{row.requestedSanction}</td>
                    <td className="px-3 py-2 text-[var(--color-accent-red)]">{row.appliedSanction}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{row.accumulationNote ?? "-"}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-[var(--color-neutral-grey)]">
                      No hay sanciones para el filtro actual.
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
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <p className="text-sm font-medium text-[var(--color-neutral-white)]">
                  #{index + 1} {item.supportName}
                </p>
                <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                  Total: {item.total} | Grave o superior: {item.warnGraveOrHigher}
                </p>
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
