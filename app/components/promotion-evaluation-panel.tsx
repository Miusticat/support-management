"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleDot,
  Clock3,
  RefreshCcw,
  Search,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type SupportEvaluation = {
  id: string;
  displayName: string;
  username: string;
  completedEvaluations: number;
  requiredEvaluations: number;
  averageScore: number | null;
  decision: "Pasa" | "No Pasa" | "Pendiente";
  pendingEvaluators: string[];
  myEvaluation: {
    score: number;
    notes: string | null;
  } | null;
  sanctionsSummary: {
    hasSanctions: boolean;
    total: number;
    text: string;
    latest: Array<{
      appliedSanction: string;
      fecha: string;
      motivo: string;
    }>;
  };
};

type Evaluator = {
  id: string;
  displayName: string;
  roleName: string;
};

type ApiResponse = {
  supports?: SupportEvaluation[];
  evaluators?: Evaluator[];
  error?: string;
};

const decisionClassMap: Record<SupportEvaluation["decision"], string> = {
  Pasa: "border-[#34d399]/35 bg-[#34d399]/12 text-[#b9f5df]",
  "No Pasa": "border-[#fb7185]/35 bg-[#fb7185]/12 text-[#ffc3cd]",
  Pendiente: "border-[#facc15]/35 bg-[#facc15]/12 text-[#ffe9a6]",
};

const decisionAccentMap: Record<SupportEvaluation["decision"], string> = {
  Pasa: "from-[#34d399]/30 to-transparent",
  "No Pasa": "from-[#fb7185]/30 to-transparent",
  Pendiente: "from-[#facc15]/20 to-transparent",
};

const scoreZoneLabel = {
  high: "Zona de aprobacion",
  medium: "Zona condicional",
  low: "Zona de no aprobacion",
} as const;

type StatusFilter = "all" | "pending" | "passed" | "failed";

function clampScore(value: number): number {
  return Math.min(10, Math.max(1, Number.isFinite(value) ? value : 1));
}

function getScoreZone(score: number): "high" | "medium" | "low" {
  if (score >= 7) {
    return "high";
  }

  if (score >= 5) {
    return "medium";
  }

  return "low";
}

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

export function PromotionEvaluationPanel() {
  const [supports, setSupports] = useState<SupportEvaluation[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedSupportId, setSelectedSupportId] = useState<string>("");
  const [activePanel, setActivePanel] = useState<"evaluate" | "sanctions">("evaluate");
  const [scoreDraft, setScoreDraft] = useState<Record<string, number>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData(showLoading: boolean) {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/discord/promotion-evaluations", {
        method: "GET",
        cache: "no-store",
      });

      const data = await parseJsonSafe<ApiResponse>(response);
      if (!response.ok) {
        throw new Error(data?.error || "No se pudieron cargar evaluaciones");
      }

      const nextSupports = Array.isArray(data?.supports) ? data.supports : [];
      const nextEvaluators = Array.isArray(data?.evaluators) ? data.evaluators : [];

      setSupports(nextSupports);
      setEvaluators(nextEvaluators);

      setScoreDraft((prev) => {
        const next = { ...prev };
        for (const support of nextSupports) {
          if (!(support.id in next)) {
            next[support.id] = support.myEvaluation?.score ?? 7;
          }
        }
        return next;
      });

      setNotesDraft((prev) => {
        const next = { ...prev };
        for (const support of nextSupports) {
          if (!(support.id in next)) {
            next[support.id] = support.myEvaluation?.notes ?? "";
          }
        }
        return next;
      });
    } catch (loadError) {
      const loadMessage = loadError instanceof Error ? loadError.message : "Error desconocido";
      setError(loadMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void loadData(true);

    const intervalId = window.setInterval(() => {
      if (!active) {
        return;
      }

      void loadData(false);
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (supports.length === 0) {
      setSelectedSupportId("");
      return;
    }

    if (!selectedSupportId || !supports.some((support) => support.id === selectedSupportId)) {
      setSelectedSupportId(supports[0].id);
    }
  }, [supports, selectedSupportId]);

  const filteredSupports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = supports.filter((support) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        support.displayName.toLowerCase().includes(normalizedQuery) ||
        support.username.toLowerCase().includes(normalizedQuery) ||
        support.id.includes(normalizedQuery);

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "pending") {
        return support.decision === "Pendiente";
      }

      if (statusFilter === "passed") {
        return support.decision === "Pasa";
      }

      if (statusFilter === "failed") {
        return support.decision === "No Pasa";
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const priorityOrder = { Pendiente: 0, "No Pasa": 1, Pasa: 2 };
      const aPriority = priorityOrder[a.decision] ?? 3;
      const bPriority = priorityOrder[b.decision] ?? 3;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aProgress = a.completedEvaluations / Math.max(1, a.requiredEvaluations);
      const bProgress = b.completedEvaluations / Math.max(1, b.requiredEvaluations);

      if (aProgress !== bProgress) {
        return aProgress - bProgress;
      }

      const aHasSanctions = a.sanctionsSummary.hasSanctions ? 0 : 1;
      const bHasSanctions = b.sanctionsSummary.hasSanctions ? 0 : 1;

      return aHasSanctions - bHasSanctions;
    });
  }, [supports, query, statusFilter]);

  const totalSupports = supports.length;
  const finalizedSupports = supports.filter((support) => support.decision !== "Pendiente").length;
  const passedSupports = supports.filter((support) => support.decision === "Pasa").length;
  const highRiskSupports = supports.filter((support) => support.sanctionsSummary.hasSanctions).length;
  const pendingSupports = supports.filter((support) => support.decision === "Pendiente").length;
  const failedSupports = supports.filter((support) => support.decision === "No Pasa").length;
  const averageCompletedScore =
    supports
      .filter((support) => typeof support.averageScore === "number")
      .reduce((acc, support) => acc + (support.averageScore ?? 0), 0) /
    Math.max(
      1,
      supports.filter((support) => typeof support.averageScore === "number").length
    );

  const completionPercent =
    totalSupports > 0 ? Math.round((finalizedSupports / totalSupports) * 100) : 0;

  const selectedSupport = useMemo(
    () => supports.find((support) => support.id === selectedSupportId) ?? null,
    [supports, selectedSupportId]
  );

  const selectedScore = selectedSupport ? scoreDraft[selectedSupport.id] ?? 7 : 7;
  const selectedZone = getScoreZone(selectedScore);

  async function refreshNow() {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  }

  async function saveEvaluation(supportId: string) {
    const score = clampScore(scoreDraft[supportId] ?? 7);
    const notes = (notesDraft[supportId] ?? "").trim();

    setSavingId(supportId);
    setMessage(null);

    try {
      const response = await fetch("/api/discord/promotion-evaluations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supportDiscordId: supportId,
          score,
          notes,
        }),
      });

      const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo guardar la evaluacion");
      }

      setMessage("Evaluacion guardada correctamente.");
      setTimeout(() => setMessage(null), 2200);
      await loadData(false);
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : "Error desconocido";
      setMessage(saveMessage);
      setTimeout(() => setMessage(null), 2600);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <UICard className="relative overflow-hidden p-5 sm:p-6">
        
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-neutral-white)] sm:text-xl">
              Evaluación de Ascenso
            </h2>
            <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
              Vista colaborativa exclusiva para Support Lead y Support Trainer. El nuevo flujo te guia paso a paso: seleccionas support, revisas contexto, evaluas con puntaje visual y registras evidencia en menos clics.
            </p>
            <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
              Evaluadores actuales: {evaluators.length > 0 ? evaluators.map((evaluator) => evaluator.displayName).join(", ") : "Sin evaluadores activos"}
            </p>
          </div>

          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-neutral-grey)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar support"
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-[var(--color-neutral-white)] outline-none transition-colors focus:border-[#ffac00]/50"
            />
          </label>
        </div>

        {message ? (
          <p className="relative z-10 mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[var(--color-neutral-grey)]">
            {message}
          </p>
        ) : null}

        {loading ? (
          <p className="relative z-10 mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-[var(--color-neutral-grey)]">
            Cargando evaluaciones...
          </p>
        ) : null}

        {error ? (
          <p className="relative z-10 mt-4 rounded-xl border border-[var(--color-accent-red)]/40 bg-[var(--color-accent-red)]/12 p-3 text-sm text-[var(--color-accent-red)]">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <div className="relative z-10 mt-5 grid gap-4 grid-cols-[280px_1fr]">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="max-h-[40rem] space-y-2 overflow-y-auto pr-1">
                {filteredSupports.map((support) => {
                  const isSelected = selectedSupportId === support.id;

                  return (
                    <button
                      key={support.id}
                      type="button"
                      onClick={() => {
                        setSelectedSupportId(support.id);
                        setActivePanel("evaluate");
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                        isSelected
                          ? "border-[#ffac00]/50 bg-[#ffac00]/15"
                          : "border-white/10 bg-transparent hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-neutral-white)] truncate">{support.displayName}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--color-neutral-grey)] truncate">
                            {support.username ? `@${support.username}` : support.id}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-[var(--color-neutral-grey)]">
                            {support.completedEvaluations}/{support.requiredEvaluations} · Faltan {Math.max(0, support.requiredEvaluations - support.completedEvaluations)}
                          </p>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${decisionClassMap[support.decision]}`}>
                          {support.decision}
                        </span>
                      </div>

                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-linear-to-r from-[#ffac00]/70 to-[#e67e22]/70"
                          style={{
                            width: `${
                              support.requiredEvaluations > 0
                                ? Math.round((support.completedEvaluations / support.requiredEvaluations) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}

                {filteredSupports.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-center text-[11px] text-[var(--color-neutral-grey)]">
                    Sin resultados
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              {!selectedSupport ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center">
                  <CircleDot className="mx-auto h-6 w-6 text-[var(--color-neutral-grey)]" />
                  <p className="mt-3 text-sm text-[var(--color-neutral-grey)]">
                    Selecciona un support desde la izquierda para abrir su workspace.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[var(--color-neutral-white)]">{selectedSupport.displayName}</h3>
                        <p className="mt-0.5 text-xs text-[var(--color-neutral-grey)]">
                          {selectedSupport.username ? `@${selectedSupport.username}` : selectedSupport.id}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${decisionClassMap[selectedSupport.decision]} ${decisionAccentMap[selectedSupport.decision]}`}>
                        {selectedSupport.decision}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]">Evaluaciones</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">
                          {selectedSupport.completedEvaluations}/{selectedSupport.requiredEvaluations}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]">Promedio</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-accent-yellow)]">
                          {selectedSupport.averageScore !== null ? selectedSupport.averageScore.toFixed(1) : "-"}/10
                        </p>
                      </div>
                    </div>
                  </div>

                  {activePanel === "sanctions" ? (
                    <div className="mt-4 max-h-48 space-y-2 overflow-auto rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      {selectedSupport.sanctionsSummary.hasSanctions ? (
                        <table className="w-full text-[10px]">
                          <tbody>
                            {selectedSupport.sanctionsSummary.latest.map((item, index) => (
                              <tr key={index} className="border-b border-white/10 text-[var(--color-neutral-grey)] last:border-0">
                                <td className="py-2">{item.fecha || "-"}</td>
                                <td className="py-2 text-[var(--color-neutral-white)]">{item.appliedSanction}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-[var(--color-neutral-grey)]">Sin sanciones registradas.</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {selectedSupport.myEvaluation ? (
                        <div className="rounded-lg border border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/10 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-green)]">
                                ✓ Evaluación completada
                              </p>
                              <p className="mt-2 text-lg font-bold text-[var(--color-neutral-white)]">
                                {selectedSupport.myEvaluation.score}/10
                              </p>
                            </div>
                          </div>
                          {selectedSupport.myEvaluation.notes && (
                            <p className="mt-3 border-t border-[var(--color-accent-green)]/20 pt-3 text-xs text-[var(--color-neutral-grey)]">
                              {selectedSupport.myEvaluation.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">
                                Mi evaluación
                              </label>
                              <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${
                                  selectedScore >= 7 ? "text-[var(--color-accent-green)]" :
                                  selectedScore >= 5 ? "text-[var(--color-accent-yellow)]" :
                                  "text-[var(--color-accent-red)]"
                                }`}>
                                  {selectedScore}
                                </span>
                                <span className="text-xs text-[var(--color-neutral-grey)]">/10</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <label htmlFor={`score-input-${selectedSupport.id}`} className="text-[11px] text-[var(--color-neutral-grey)]">
                                Escribir calificación
                              </label>
                              <input
                                id={`score-input-${selectedSupport.id}`}
                                type="number"
                                min={1}
                                max={10}
                                step={1}
                                value={selectedScore}
                                onChange={(e) =>
                                  setScoreDraft((prev) => ({
                                    ...prev,
                                    [selectedSupport.id]: clampScore(Number(e.target.value)),
                                  }))
                                }
                                className="w-18 rounded-md border border-white/15 bg-[#1a1a1a] px-2 py-1 text-center text-sm text-[var(--color-neutral-white)] outline-none focus:border-[#ffac00]/50"
                              />
                            </div>

                            <input
                              type="range"
                              min={1}
                              max={10}
                              step={1}
                              value={selectedScore}
                              onChange={(e) =>
                                setScoreDraft((prev) => ({
                                  ...prev,
                                  [selectedSupport.id]: clampScore(Number(e.target.value)),
                                }))
                              }
                              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#ffac00]"
                            />

                            <div className="grid grid-cols-3 gap-1 pt-1 text-[10px]">
                              <div className="text-center">
                                <p className="text-[var(--color-accent-red)]">1-4</p>
                                <p className="text-[var(--color-neutral-grey)]">No aprueba</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[var(--color-accent-yellow)]">5-6</p>
                                <p className="text-[var(--color-neutral-grey)]">Condicional</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[var(--color-accent-green)]">7-10</p>
                                <p className="text-[var(--color-neutral-grey)]">Aprueba</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">
                              Observaciones
                            </label>
                            <textarea
                              value={notesDraft[selectedSupport.id] ?? ""}
                              onChange={(e) =>
                                setNotesDraft((prev) => ({
                                  ...prev,
                                  [selectedSupport.id]: e.target.value,
                                }))
                              }
                              placeholder="Ingresa tu evaluación, contexto, o razón de tu puntaje..."
                              className="min-h-20 w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-xs text-[var(--color-neutral-white)] placeholder-[var(--color-neutral-grey)]/60 outline-none transition focus:border-[#ffac00]/50 focus:bg-[#1a1a1a]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => saveEvaluation(selectedSupport.id)}
                            disabled={savingId === selectedSupport.id}
                            className="w-full rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#ffac00] transition-all hover:border-[#ffac00]/60 hover:bg-[#ffac00]/30 disabled:opacity-50"
                          >
                            {savingId === selectedSupport.id ? "Guardando evaluación..." : "Guardar evaluación"}
                          </button>

                          {selectedSupport.sanctionsSummary.hasSanctions ? (
                            <button
                              type="button"
                              onClick={() => setActivePanel("sanctions")}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-neutral-grey)] transition hover:border-white/20 hover:bg-white/10 hover:text-[var(--color-neutral-white)]"
                            >
                              Ver historial de sanciones • {selectedSupport.sanctionsSummary.total}
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}
      </UICard>
  );
}
