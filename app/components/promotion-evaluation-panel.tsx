"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDot,
  Clock3,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
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

    return supports.filter((support) => {
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <UICard className="group relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--color-accent-blue)]/20 blur-xl transition-transform duration-500 group-hover:scale-125" />
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Candidatos</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{totalSupports}</p>
          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">Supports en el ciclo</p>
        </UICard>

        <UICard className="group relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--color-accent-green)]/20 blur-xl transition-transform duration-500 group-hover:scale-125" />
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Evaluadores</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{evaluators.length}</p>
          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">Roles activos</p>
        </UICard>

        <UICard className="group relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--color-primary)]/20 blur-xl transition-transform duration-500 group-hover:scale-125" />
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Completado</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{completionPercent}%</p>
          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">Decisiones cerradas</p>
        </UICard>

        <UICard className="group relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--color-accent-yellow)]/20 blur-xl transition-transform duration-500 group-hover:scale-125" />
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Pendientes</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{pendingSupports}</p>
          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">Aun sin cierre</p>
        </UICard>

        <UICard className="group relative overflow-hidden p-5 sm:col-span-2 xl:col-span-1">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--color-accent-red)]/20 blur-xl transition-transform duration-500 group-hover:scale-125" />
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Riesgo</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{highRiskSupports}</p>
          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">Con sanciones previas</p>
        </UICard>
      </div>

      <UICard className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-24 top-6 h-44 w-44 rounded-full bg-[var(--color-accent-blue)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-36 w-36 rounded-full bg-[var(--color-accent-green)]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-blue)]" />
              Flujo guiado de evaluación
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-2xl">
              Workspace de evaluación de ascenso
            </h2>
            <p className="max-w-2xl text-sm text-[var(--color-neutral-grey)]">
              Elige un support, revisa contexto y puntúa en una sola vista. El promedio final determina el resultado automáticamente cuando ambos evaluadores concluyen.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-neutral-grey)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, usuario o id"
                className="w-full rounded-xl border border-white/10 bg-[#0f1426]/90 py-2 pl-9 pr-3 text-sm text-[var(--color-neutral-white)] outline-none transition-colors focus:border-[var(--color-primary)]/60 sm:w-80"
              />
            </label>

            <button
              type="button"
              onClick={refreshNow}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] transition hover:bg-white/[0.06] disabled:opacity-60"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Actualizando" : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Paso 1</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-neutral-white)]">Filtra y selecciona support</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Paso 2</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-neutral-white)]">Analiza progreso y sanciones</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">Paso 3</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-neutral-white)]">Asigna puntaje y guarda</p>
          </div>
        </div>

        <div className="relative z-10 mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-neutral-grey)]">
            <span>Avance global del ciclo</span>
            <span>
              {finalizedSupports}/{totalSupports} cerrados
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-linear-to-r from-[var(--color-accent-green)]/70 to-[var(--color-accent-blue)]/70 transition-all duration-700"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
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
          <div className="relative z-10 mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.3fr)]">
            <div className="rounded-2xl border border-white/10 bg-[#0b1227]/75 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    statusFilter === "all"
                      ? "border-white/20 bg-white/10 text-[var(--color-neutral-white)]"
                      : "border-white/10 bg-transparent text-[var(--color-neutral-grey)] hover:border-white/20"
                  }`}
                >
                  Todos ({totalSupports})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending")}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    statusFilter === "pending"
                      ? "border-[#facc15]/40 bg-[#facc15]/12 text-[#ffe9a6]"
                      : "border-white/10 bg-transparent text-[var(--color-neutral-grey)] hover:border-white/20"
                  }`}
                >
                  Pendiente ({pendingSupports})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("passed")}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    statusFilter === "passed"
                      ? "border-[#34d399]/40 bg-[#34d399]/12 text-[#b9f5df]"
                      : "border-white/10 bg-transparent text-[var(--color-neutral-grey)] hover:border-white/20"
                  }`}
                >
                  Pasa ({passedSupports})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("failed")}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    statusFilter === "failed"
                      ? "border-[#fb7185]/40 bg-[#fb7185]/12 text-[#ffc3cd]"
                      : "border-white/10 bg-transparent text-[var(--color-neutral-grey)] hover:border-white/20"
                  }`}
                >
                  No pasa ({failedSupports})
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-neutral-grey)]">
                <p>Supports visibles: {filteredSupports.length}</p>
                <p className="inline-flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Promedio general: {Number.isFinite(averageCompletedScore) ? averageCompletedScore.toFixed(1) : "0.0"}
                </p>
              </div>

              <div className="mt-3 max-h-[33rem] space-y-2 overflow-y-auto pr-1">
                {filteredSupports.map((support) => {
                  const progressPercent =
                    support.requiredEvaluations > 0
                      ? Math.round((support.completedEvaluations / support.requiredEvaluations) * 100)
                      : 0;
                  const isSelected = selectedSupportId === support.id;

                  return (
                    <button
                      key={support.id}
                      type="button"
                      onClick={() => {
                        setSelectedSupportId(support.id);
                        setActivePanel("evaluate");
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-[var(--color-accent-blue)]/45 bg-[var(--color-accent-blue)]/12"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-neutral-white)]">{support.displayName}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-neutral-grey)]">
                            {support.username ? `@${support.username}` : support.id}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${decisionClassMap[support.decision]}`}>
                          {support.decision}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-neutral-grey)]">
                        <span>
                          Progreso {support.completedEvaluations}/{support.requiredEvaluations}
                        </span>
                        <span>Promedio {support.averageScore ?? "-"}</span>
                      </div>

                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-[var(--color-accent-blue)]/70 to-[var(--color-primary)]/70"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {support.pendingEvaluators.length > 0 ? (
                        <p className="mt-2 text-[11px] text-[var(--color-neutral-grey)]">
                          Pendientes: {support.pendingEvaluators.join(", ")}
                        </p>
                      ) : (
                        <p className="mt-2 text-[11px] text-[var(--color-accent-green)]">Todos los evaluadores completaron</p>
                      )}
                    </button>
                  );
                })}

                {filteredSupports.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center">
                    <p className="text-sm text-[var(--color-neutral-grey)]">No hay supports con el filtro actual.</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1227]/75 p-4 sm:p-5">
              {!selectedSupport ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center">
                  <CircleDot className="mx-auto h-6 w-6 text-[var(--color-neutral-grey)]" />
                  <p className="mt-3 text-sm text-[var(--color-neutral-grey)]">
                    Selecciona un support desde la izquierda para abrir su workspace.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">
                        <Users className="h-3.5 w-3.5" />
                        Support seleccionado
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--color-neutral-white)]">{selectedSupport.displayName}</h3>
                      <p className="text-xs text-[var(--color-neutral-grey)]">
                        {selectedSupport.username ? `@${selectedSupport.username}` : selectedSupport.id}
                      </p>
                    </div>

                    <span className={`inline-flex rounded-md border bg-linear-to-r px-2.5 py-1 text-xs font-medium ${decisionClassMap[selectedSupport.decision]} ${decisionAccentMap[selectedSupport.decision]}`}>
                      Estado: {selectedSupport.decision}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-neutral-grey)]">Progreso</p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-neutral-white)]">
                        {selectedSupport.completedEvaluations}/{selectedSupport.requiredEvaluations}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-neutral-grey)]">Promedio</p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-neutral-white)]">{selectedSupport.averageScore ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-neutral-grey)]">Pendientes</p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-neutral-white)]">
                        {selectedSupport.pendingEvaluators.length > 0
                          ? selectedSupport.pendingEvaluators.join(", ")
                          : "Sin pendientes"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    <button
                      type="button"
                      onClick={() => setActivePanel("evaluate")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                        activePanel === "evaluate"
                          ? "border border-white/20 bg-white/10 text-[var(--color-neutral-white)]"
                          : "text-[var(--color-neutral-grey)] hover:bg-white/[0.04]"
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Evaluacion
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePanel("sanctions")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                        activePanel === "sanctions"
                          ? "border border-white/20 bg-white/10 text-[var(--color-neutral-white)]"
                          : "text-[var(--color-neutral-grey)] hover:bg-white/[0.04]"
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Historial de sanciones
                    </button>
                  </div>

                  {activePanel === "sanctions" ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-sm font-medium text-[var(--color-neutral-white)]">Contexto disciplinario</p>
                        <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">{selectedSupport.sanctionsSummary.text}</p>
                      </div>

                      {!selectedSupport.sanctionsSummary.hasSanctions ? (
                        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-[var(--color-neutral-grey)]">
                          Sin sanciones registradas.
                        </p>
                      ) : (
                        <div className="overflow-auto rounded-xl border border-white/10">
                          <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="bg-[#11182f] text-[var(--color-neutral-grey)]">
                              <tr>
                                <th className="px-3 py-2 font-medium">Fecha</th>
                                <th className="px-3 py-2 font-medium">Sancion</th>
                                <th className="px-3 py-2 font-medium">Motivo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSupport.sanctionsSummary.latest.map((item, index) => (
                                <tr key={`${item.fecha}-${item.appliedSanction}-${index}`} className="border-t border-white/10">
                                  <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{item.fecha || "-"}</td>
                                  <td className="px-3 py-2 text-[var(--color-neutral-white)]">{item.appliedSanction}</td>
                                  <td className="px-3 py-2 text-[var(--color-neutral-grey)]">{item.motivo || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedSupport.myEvaluation ? (
                        <div className="rounded-xl border border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/10 p-4">
                          <p className="text-sm text-[var(--color-neutral-white)]">
                            Tu evaluacion ya fue registrada y no puede modificarse.
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                            Puntaje registrado: {selectedSupport.myEvaluation.score}/10
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                            Observacion: {selectedSupport.myEvaluation.notes || "-"}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-[var(--color-neutral-white)]">Puntaje de evaluacion</p>
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-sm text-[var(--color-neutral-white)]">
                                <Star className="h-3.5 w-3.5 text-[var(--color-accent-yellow)]" />
                                {selectedScore}/10
                              </span>
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
                              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10"
                            />

                            <div className="mt-3 grid grid-cols-[1fr,auto] items-center gap-3">
                              <div className="rounded-lg border border-white/10 bg-[#0f1426] px-3 py-2 text-xs text-[var(--color-neutral-grey)]">
                                Escala: 1-4 no aprueba | 5-6 condicional | 7-10 aprueba
                              </div>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={selectedScore}
                                onChange={(e) =>
                                  setScoreDraft((prev) => ({
                                    ...prev,
                                    [selectedSupport.id]: clampScore(Number(e.target.value) || 1),
                                  }))
                                }
                                className="w-20 rounded-lg border border-white/10 bg-[#0f1426] px-2 py-1.5 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[var(--color-primary)]/60"
                              />
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <p className="inline-flex items-center gap-1.5 text-xs text-[var(--color-neutral-grey)]">
                              {selectedZone === "high" ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-accent-green)]" />
                                  {scoreZoneLabel[selectedZone]}
                                </>
                              ) : selectedZone === "medium" ? (
                                <>
                                  <Clock3 className="h-3.5 w-3.5 text-[var(--color-accent-yellow)]" />
                                  {scoreZoneLabel[selectedZone]}
                                </>
                              ) : (
                                <>
                                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-accent-red)]" />
                                  {scoreZoneLabel[selectedZone]}
                                </>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                              Recomendacion visual: {selectedZone === "high" ? "candidato fuerte" : selectedZone === "medium" ? "requiere seguimiento" : "riesgo para ascenso"}.
                            </p>
                          </div>

                          <textarea
                            value={notesDraft[selectedSupport.id] ?? ""}
                            onChange={(e) =>
                              setNotesDraft((prev) => ({
                                ...prev,
                                [selectedSupport.id]: e.target.value,
                              }))
                            }
                            placeholder="Escribe observaciones concretas (fortalezas, mejoras, comportamientos relevantes)."
                            className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f1426] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[var(--color-primary)]/60"
                          />

                          <button
                            type="button"
                            onClick={() => saveEvaluation(selectedSupport.id)}
                            disabled={savingId === selectedSupport.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-accent-blue)]/35 bg-[var(--color-accent-blue)]/15 px-4 py-2 text-sm text-[var(--color-neutral-white)] transition-colors hover:bg-[var(--color-accent-blue)]/25 disabled:opacity-60"
                          >
                            <Sparkles className="h-4 w-4" />
                            {savingId === selectedSupport.id ? "Guardando evaluacion..." : "Guardar evaluacion"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[var(--color-neutral-grey)]">
              <p className="inline-flex items-center gap-1.5 font-medium text-[var(--color-neutral-white)]">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--color-accent-green)]" />
                Tasa de aprobacion
              </p>
              <p className="mt-1">{totalSupports > 0 ? Math.round((passedSupports / totalSupports) * 100) : 0}% del ciclo.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[var(--color-neutral-grey)]">
              <p className="inline-flex items-center gap-1.5 font-medium text-[var(--color-neutral-white)]">
                <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-accent-red)]" />
                Casos no aprobados
              </p>
              <p className="mt-1">{failedSupports} registros con decision final negativa.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[var(--color-neutral-grey)]">
              <p className="inline-flex items-center gap-1.5 font-medium text-[var(--color-neutral-white)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-accent-blue)]" />
                Evaluadores activos
              </p>
              <p className="mt-1">
                {evaluators.map((item) => `${item.displayName} (${item.roleName})`).join(" | ") || "Sin evaluadores"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[var(--color-neutral-grey)]">
              <p className="inline-flex items-center gap-1.5 font-medium text-[var(--color-neutral-white)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-yellow)]" />
                Criterio de cierre
              </p>
              <p className="mt-1">Aprobacion automatica cuando el promedio final es mayor o igual a 7/10.</p>
            </div>
          </div>
        ) : null}
      </UICard>
    </div>
  );
}
