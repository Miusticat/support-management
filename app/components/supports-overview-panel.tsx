"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { UICard } from "@/app/components/ui-card";

type SupportItem = {
  id: string;
  displayName: string;
  username: string;
  role: "Support Lead" | "Support Trainer" | "Support";
  roleLevel: number;
  sanctions: {
    total: number;
    advertencia: number;
    warnIntermedio: number;
    warnGrave: number;
    suspension: number;
    remocion: number;
  };
  status: {
    label: string;
    severity: "clean" | "low" | "medium" | "high" | "critical";
    score: number;
  };
  manualStatus: {
    value: "Activo" | "Expulsado" | "Renuncio" | "Reincorporado";
    updatedByName: string | null;
    updatedAt: string | null;
  };
};

type SupportsResponse = {
  supports?: SupportItem[];
  totals?: {
    all?: number;
    clean?: number;
    highRisk?: number;
  };
  error?: string;
};

const statusBadgeClass: Record<SupportItem["status"]["severity"], string> = {
  clean: "border-[#34d399]/35 bg-[#34d399]/12 text-[#b9f5df]",
  low: "border-[#93c5fd]/35 bg-[#93c5fd]/12 text-[#d6e9ff]",
  medium: "border-[#facc15]/35 bg-[#facc15]/12 text-[#ffe9a6]",
  high: "border-[#fb923c]/35 bg-[#fb923c]/12 text-[#ffd3b0]",
  critical: "border-[#fb7185]/35 bg-[#fb7185]/12 text-[#ffc3cd]",
};

const roleBadgeClass: Record<SupportItem["role"], string> = {
  "Support Lead": "border-[#f59e0b]/35 bg-[#f59e0b]/12 text-[#ffd79a]",
  "Support Trainer": "border-[#60a5fa]/35 bg-[#60a5fa]/12 text-[#d2e7ff]",
  Support: "border-[#34d399]/35 bg-[#34d399]/12 text-[#b9f5df]",
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function SupportsOverviewPanel() {
  const { data: session } = useSession();
  const [supports, setSupports] = useState<SupportItem[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualStatusDraft, setManualStatusDraft] = useState<Record<string, SupportItem["manualStatus"]["value"]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentRole = session?.user?.staffRole ?? null;
  const canManageManualStatus =
    currentRole === "Support Lead" || currentRole === "Support Trainer";

  useEffect(() => {
    let active = true;

    async function loadSupports(showLoading: boolean) {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await fetch("/api/discord/supports", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
        });

        const data = await parseJsonSafe<SupportsResponse>(response);
        if (!response.ok) {
          throw new Error(data?.error || "No se pudo cargar Supports");
        }

        if (!active) {
          return;
        }

        setSupports(Array.isArray(data?.supports) ? data.supports : []);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Error desconocido";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSupports(true);

    const intervalId = window.setInterval(() => {
      void loadSupports(false);
    }, 25000);

    const onFocus = () => {
      void loadSupports(false);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const filteredSupports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return supports.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status.severity === statusFilter;
      const matchesText =
        normalizedQuery.length === 0 ||
        item.displayName.toLowerCase().includes(normalizedQuery) ||
        item.username.toLowerCase().includes(normalizedQuery) ||
        item.id.includes(normalizedQuery);

      return matchesStatus && matchesText;
    });
  }, [supports, query, statusFilter]);

  const totals = useMemo(
    () => ({
      all: supports.filter((item) => item.role === "Support").length,
      clean: supports.filter((item) => item.status.severity === "clean" && item.role === "Support").length,
      risk: supports.filter((item) => ["high", "critical"].includes(item.status.severity) && item.role === "Support").length,
    }),
    [supports]
  );

  async function saveManualStatus(supportId: string) {
    if (!canManageManualStatus) {
      return;
    }

    const item = supports.find((support) => support.id === supportId);
    if (!item) {
      return;
    }

    const nextStatus = manualStatusDraft[supportId] ?? item.manualStatus.value;

    setSavingId(supportId);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/discord/supports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supportDiscordId: supportId,
          manualStatus: nextStatus,
        }),
      });

      const data = await parseJsonSafe<{ error?: string; ok?: boolean }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo guardar el estado");
      }

      setSupports((prev) =>
        prev.map((support) =>
          support.id === supportId
            ? {
                ...support,
                manualStatus: {
                  value: nextStatus,
                  updatedByName: session?.user?.name ?? support.manualStatus.updatedByName,
                  updatedAt: new Date().toISOString(),
                },
              }
            : support
        )
      );

      setEditingId((current) => (current === supportId ? null : current));
      setManualStatusDraft((prev) => {
        const next = { ...prev };
        delete next[supportId];
        return next;
      });

      setSaveMessage("Estado actualizado correctamente.");
      setTimeout(() => setSaveMessage(null), 2200);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Error desconocido";
      setSaveMessage(message);
      setTimeout(() => setSaveMessage(null), 2800);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Total Supports</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{totals.all}</p>
        </UICard>
        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Historial limpio</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-accent-green)]">{totals.clean}</p>
        </UICard>
        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Riesgo alto/crítico</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-accent-red)]">{totals.risk}</p>
        </UICard>
      </div>

      <UICard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-neutral-white)]">Control de Supports</h2>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-neutral-grey)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, @usuario o ID"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[#ffac00]/50 sm:w-72"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[#ffac00]/50"
              style={{ colorScheme: "dark" }}
            >
              <option value="all">Todos los estados</option>
              <option value="clean">Historial limpio</option>
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
              <option value="critical">Crítico</option>
            </select>
          </div>
        </div>

        {canManageManualStatus ? (
          <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">
            Puedes gestionar estado administrativo por miembro: Expulsado, renunció, o fue reincorporado.
          </p>
        ) : null}

        {saveMessage ? (
          <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">{saveMessage}</p>
        ) : null}

        {loading ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-[var(--color-neutral-grey)]">
            Cargando lista de supports...
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-[var(--color-accent-red)]/40 bg-[var(--color-accent-red)]/12 px-4 py-3 text-sm text-[var(--color-accent-red)]">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <div className="mt-4 overflow-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[#1a1a1a] text-[var(--color-neutral-grey)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Support</th>
                  <th className="px-3 py-2 font-medium">Rango</th>
                  <th className="px-3 py-2 font-medium">Estado administrativo</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Total sanciones</th>
                  <th className="px-3 py-2 font-medium">Advertencia</th>
                  <th className="px-3 py-2 font-medium">Advertencia intermedia</th>
                  <th className="px-3 py-2 font-medium">Advertencia grave</th>
                  <th className="px-3 py-2 font-medium">Suspensión</th>
                  <th className="px-3 py-2 font-medium">Remoción</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupports.map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="px-3 py-2">
                      <p className="font-medium text-[var(--color-neutral-white)]">{item.displayName}</p>
                      <p className="text-xs text-[var(--color-neutral-grey)]">
                        {item.username ? `@${item.username}` : item.id}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${roleBadgeClass[item.role]}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {canManageManualStatus && editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={manualStatusDraft[item.id] ?? item.manualStatus.value}
                            onChange={(e) =>
                              setManualStatusDraft((prev) => ({
                                ...prev,
                                [item.id]: e.target.value as SupportItem["manualStatus"]["value"],
                              }))
                            }
                            className="rounded-lg border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-[var(--color-neutral-white)] outline-none focus:border-[#ffac00]/50"
                            style={{ colorScheme: "dark" }}
                          >
                            <option value="Activo">Activo</option>
                            <option value="Expulsado">Expulsado</option>
                            <option value="Renuncio">Renuncio</option>
                            <option value="Reincorporado">Reincorporado</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => saveManualStatus(item.id)}
                            disabled={savingId === item.id}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-[var(--color-neutral-white)] disabled:opacity-60"
                          >
                            {savingId === item.id ? "Guardando..." : "Guardar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setManualStatusDraft((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            disabled={savingId === item.id}
                            className="rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-xs text-[var(--color-neutral-grey)] disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-[var(--color-neutral-white)]">{item.manualStatus.value}</p>
                          {canManageManualStatus ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(item.id);
                                setManualStatusDraft((prev) => ({
                                  ...prev,
                                  [item.id]: item.manualStatus.value,
                                }));
                              }}
                              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-[var(--color-neutral-white)]"
                            >
                              Editar
                            </button>
                          ) : null}
                        </div>
                      )}

                      {item.manualStatus.updatedByName ? (
                        <p className="mt-1 text-[11px] text-[var(--color-neutral-grey)]">
                          Por: {item.manualStatus.updatedByName}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusBadgeClass[item.status.severity]}`}>
                        {item.status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-neutral-white)]">{item.sanctions.total}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{item.sanctions.advertencia}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{item.sanctions.warnIntermedio}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{item.sanctions.warnGrave}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{item.sanctions.suspension}</td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{item.sanctions.remocion}</td>
                  </tr>
                ))}

                {filteredSupports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-[var(--color-neutral-grey)]">
                      No hay supports para el filtro actual.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </UICard>

      <UICard className="p-4">
        <div className="grid grid-cols-1 gap-3 text-xs text-[var(--color-neutral-grey)] sm:grid-cols-3">
          <p className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" /> Lista desde Discord</p>
          <p className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Historial limpio = 0 sanciones</p>
          <p className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Estado por gravedad acumulada</p>
        </div>
      </UICard>
    </div>
  );
}
