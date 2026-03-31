"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { UICard } from "@/app/components/ui-card";

type SupportItem = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
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
  positivePoints: {
    total: number;
    records: number;
    lastGrantedAt: string | null;
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

const manualStatusClass: Record<SupportItem["manualStatus"]["value"], string> = {
  Activo: "border-[#34d399]/30 bg-[#34d399]/10 text-[#b9f5df]",
  Expulsado: "border-[#fb7185]/35 bg-[#fb7185]/10 text-[#ffc3cd]",
  Renuncio: "border-[#f59e0b]/35 bg-[#f59e0b]/10 text-[#ffd79a]",
  Reincorporado: "border-[#60a5fa]/35 bg-[#60a5fa]/10 text-[#d2e7ff]",
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
    }).sort((a, b) => {
      if (b.roleLevel !== a.roleLevel) {
        return b.roleLevel - a.roleLevel;
      }

      if (b.positivePoints.total !== a.positivePoints.total) {
        return b.positivePoints.total - a.positivePoints.total;
      }

      if (a.sanctions.total !== b.sanctions.total) {
        return a.sanctions.total - b.sanctions.total;
      }

      return a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" });
    });
  }, [supports, query, statusFilter]);

  const totals = useMemo(
    () => ({
      all: supports.filter((item) => item.role === "Support").length,
      clean: supports.filter((item) => item.status.severity === "clean" && item.role === "Support").length,
      risk: supports.filter((item) => ["high", "critical"].includes(item.status.severity) && item.role === "Support").length,
      positivePoints: supports.reduce((sum, item) => sum + item.positivePoints.total, 0),
      rewarded: supports.filter((item) => item.positivePoints.total > 0).length,
    }),
    [supports]
  );

  const spotlightSupports = useMemo(
    () =>
      filteredSupports
        .filter((item) => item.positivePoints.total > 0)
        .slice(0, 4),
    [filteredSupports]
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <UICard className="p-5 xl:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">Total Supports</p>
          <p className="mt-2 text-3xl font-bold text-(--color-neutral-white)">{totals.all}</p>
        </UICard>
        <UICard className="p-5 xl:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">Historial limpio</p>
          <p className="mt-2 text-3xl font-bold text-(--color-accent-green)">{totals.clean}</p>
        </UICard>
        <UICard className="p-5 xl:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">Riesgo alto/crítico</p>
          <p className="mt-2 text-3xl font-bold text-(--color-accent-red)">{totals.risk}</p>
        </UICard>
        <UICard className="p-5 xl:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">Puntos positivos</p>
          <p className="mt-2 text-3xl font-bold text-[#ffd580]">{Math.round(totals.positivePoints * 10) / 10}</p>
        </UICard>
        <UICard className="p-5 xl:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">Supports reconocidos</p>
          <p className="mt-2 text-3xl font-bold text-[#ffd580]">{totals.rewarded}</p>
        </UICard>
      </div>

      <UICard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-(--color-neutral-white)">Control de Supports</h2>
            <p className="mt-1 text-xs text-(--color-neutral-grey)">Vista resumida para identificar desempeño, sanciones y estado administrativo.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-(--color-neutral-grey)" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, @usuario o ID"
                className="w-full rounded-xl border border-white/8 bg-white/3 py-2 pl-9 pr-3 text-sm text-(--color-neutral-white) outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)] sm:w-72"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-sm text-(--color-neutral-white) outline-none transition-all focus:border-[#ffac00]/40"
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
          <p className="mt-2 text-xs text-(--color-neutral-grey)">
            Puedes gestionar estado administrativo por miembro: Expulsado, renunció, o fue reincorporado.
          </p>
        ) : null}

        {saveMessage ? (
          <p className="mt-2 text-xs text-(--color-neutral-grey)">{saveMessage}</p>
        ) : null}

        {loading ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3 text-sm text-(--color-neutral-grey)">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffac00]/30 border-t-[#ffac00]" />
            Cargando lista de supports...
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-(--color-accent-red)/30 bg-(--color-accent-red)/[0.07] px-4 py-3 text-sm text-(--color-accent-red)">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredSupports.map((item) => {
              const graveCount = item.sanctions.warnGrave + item.sanctions.suspension + item.sanctions.remocion;
              const isSpotlight = item.positivePoints.total > 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isSpotlight
                      ? "border-[#ffac00]/25 bg-linear-to-br from-[#ffac00]/8 via-white/1 to-[#e67e22]/6"
                      : "border-white/6 bg-white/2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#5865f2]/25 text-sm font-semibold text-[#dbe3ff]">
                        {item.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.avatarUrl} alt={item.displayName} className="h-full w-full object-cover" />
                        ) : (
                          item.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-(--color-neutral-white)">{item.displayName}</p>
                        <p className="truncate text-xs text-(--color-neutral-grey)">
                          {item.username ? `@${item.username}` : item.id}
                        </p>
                      </div>
                    </div>

                    {isSpotlight ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#ffac00]/35 bg-[#ffac00]/12 px-2 py-1 text-[11px] font-medium text-[#ffd580]">
                        <Sparkles className="h-3 w-3" /> Destacado
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${roleBadgeClass[item.role]}`}>
                      {item.role}
                    </span>
                    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${statusBadgeClass[item.status.severity]}`}>
                      {item.status.label}
                    </span>
                    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${manualStatusClass[item.manualStatus.value]}`}>
                      {item.manualStatus.value}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/6 bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-(--color-neutral-grey)/75">Puntos +</p>
                      <p className="mt-1 text-xl font-bold text-[#ffd580]">{Math.round(item.positivePoints.total * 10) / 10}</p>
                      <p className="text-[10px] text-(--color-neutral-grey)">{item.positivePoints.records} registro(s)</p>
                    </div>
                    <div className="rounded-lg border border-white/6 bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-(--color-neutral-grey)/75">Sanciones</p>
                      <p className="mt-1 text-xl font-bold text-(--color-neutral-white)">{item.sanctions.total}</p>
                      <p className="text-[10px] text-(--color-neutral-grey)">Total acumulado</p>
                    </div>
                    <div className="rounded-lg border border-white/6 bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-(--color-neutral-grey)/75">Riesgo grave</p>
                      <p className="mt-1 text-xl font-bold text-(--color-neutral-white)">{graveCount}</p>
                      <p className="text-[10px] text-(--color-neutral-grey)">WG + Susp + Rem</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-(--color-neutral-grey)">
                    <span>Adv: {item.sanctions.advertencia}</span>
                    <span>Intermedia: {item.sanctions.warnIntermedio}</span>
                    <span>Grave: {item.sanctions.warnGrave}</span>
                    <span>Susp: {item.sanctions.suspension}</span>
                    <span>Rem: {item.sanctions.remocion}</span>
                  </div>

                  {canManageManualStatus ? (
                    <div className="mt-3 rounded-lg border border-white/8 bg-white/2 p-2.5">
                      {editingId === item.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={manualStatusDraft[item.id] ?? item.manualStatus.value}
                            onChange={(e) =>
                              setManualStatusDraft((prev) => ({
                                ...prev,
                                [item.id]: e.target.value as SupportItem["manualStatus"]["value"],
                              }))
                            }
                            className="rounded-lg border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-(--color-neutral-white) outline-none focus:border-[#ffac00]/50"
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
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-(--color-neutral-white) disabled:opacity-60"
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
                            className="rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-xs text-(--color-neutral-grey) disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-(--color-neutral-grey)">
                            Estado administrativo: <span className="text-(--color-neutral-white)">{item.manualStatus.value}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setManualStatusDraft((prev) => ({
                                ...prev,
                                [item.id]: item.manualStatus.value,
                              }));
                            }}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-(--color-neutral-white)"
                          >
                            Editar
                          </button>
                        </div>
                      )}

                      {item.manualStatus.updatedByName ? (
                        <p className="mt-2 text-[11px] text-(--color-neutral-grey)">
                          Actualizado por: {item.manualStatus.updatedByName}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {filteredSupports.length === 0 ? (
              <div className="xl:col-span-2 rounded-xl border border-white/6 bg-white/2 px-4 py-12 text-center">
                <UsersRound className="mx-auto mb-3 h-8 w-8 text-(--color-neutral-grey)/30" />
                <p className="text-sm text-(--color-neutral-grey)">No hay supports para el filtro actual.</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </UICard>

      {spotlightSupports.length > 0 ? (
        <UICard className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-(--color-neutral-white)">Supports destacados por puntos positivos</h3>
            <span className="text-xs text-(--color-neutral-grey)">Top {spotlightSupports.length}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            {spotlightSupports.map((item) => (
              <div key={`spotlight-${item.id}`} className="rounded-xl border border-[#ffac00]/20 bg-[#ffac00]/[0.07] p-3">
                <p className="truncate text-sm font-semibold text-(--color-neutral-white)">{item.displayName}</p>
                <p className="mt-1 text-xs text-(--color-neutral-grey)">{item.role}</p>
                <p className="mt-2 text-lg font-bold text-[#ffd580]">+{Math.round(item.positivePoints.total * 10) / 10}</p>
                <p className="text-[11px] text-(--color-neutral-grey)">{item.positivePoints.records} registro(s)</p>
              </div>
            ))}
          </div>
        </UICard>
      ) : null}

      <UICard className="p-4">
        <div className="grid grid-cols-1 gap-3 text-xs text-(--color-neutral-grey) sm:grid-cols-3">
          <p className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" /> Lista desde Discord</p>
          <p className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Historial limpio = 0 sanciones</p>
          <p className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Destacado = puntos positivos acumulados</p>
        </div>
      </UICard>
    </div>
  );
}

