"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleDot,
  Clock3,
  FileDown,
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
  autoAveragedMissingVotes: number;
  evaluations: Array<{
    evaluatorName: string;
    score: number;
    notes: string | null;
    updatedAt: string;
  }>;
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
  positivePointsSummary: {
    hasPositivePoints: boolean;
    totalRecords: number;
    totalPoints: number;
    text: string;
    latest: Array<{
      pointType: string;
      pointValue: number;
      fecha: string;
      justificacion: string;
      observaciones: string | null;
    }>;
  };
  cutStatus: "aprobado_corte_1" | "rechazado_corte_1_en_mejora" | "pendiente_corte_1" | "aprobado_corte_2" | "rechazado_corte_2_retiro" | "pendiente_corte_2" | "sin_cortes";
  activeCutNumber: 0 | 1 | 2;
  inImprovementPeriod: boolean;
};

type SecondEvaluationSupport = {
  id: string;
  displayName: string;
  username: string;
  completedEvaluations: number;
  requiredEvaluations: number;
  averageScore: number | null;
  decision: "Pasa" | "No Pasa" | "Pendiente";
  pendingEvaluators: string[];
  evaluations: Array<{
    evaluatorName: string;
    score: number;
    notes: string | null;
    updatedAt: string;
  }>;
  myEvaluation: {
    score: number;
    notes: string | null;
  } | null;
  previousRound: {
    averageScore: number | null;
    completedEvaluations: number;
    evaluations: Array<{
      evaluatorName: string;
      score: number;
      notes: string | null;
      updatedAt: string;
    }>;
  };
};

type VotingState = {
  deadlineIso: string | null;
  isClosed: boolean;
  managedByDiscordId: string | null;
};

type PromotionCohort = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  supportDiscordIds: string[];
};

type Evaluator = {
  id: string;
  displayName: string;
  roleName: string;
};

type ApiResponse = {
  supports?: SupportEvaluation[];
  secondEvaluation?: {
    enabled: boolean;
    supports: SecondEvaluationSupport[];
  };
  evaluators?: Evaluator[];
  voting?: VotingState;
  cohort?: PromotionCohort | null;
  permissions?: {
    canManageDeadline?: boolean;
  };
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
type DetailPanel = "evaluate" | "sanctions" | "positivePoints";

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

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatCountdown(targetIso: string, nowMs: number) {
  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) {
    return "Fecha invalida";
  }

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) {
    return "Cerrada";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}d ${hours}h ${minutes}m`;
}

function buildPromotionReport(input: {
  supports: SupportEvaluation[];
  evaluators: Evaluator[];
  voting: VotingState;
  cohort: PromotionCohort | null;
  generatedAt: Date;
}) {
  const { supports, evaluators, voting, cohort, generatedAt } = input;
  const lines: string[] = [];

  lines.push("# Informe de Evaluacion de Ascenso");
  lines.push("");
  lines.push(`Generado: ${generatedAt.toLocaleString("es-ES")}`);
  lines.push(`Evaluadores activos: ${evaluators.map((item) => item.displayName).join(", ") || "Sin evaluadores"}`);
  lines.push(`Total de supports evaluados: ${supports.length}`);
  lines.push(`Plazo de votacion: ${voting.deadlineIso ? formatDateTime(voting.deadlineIso) : "Sin fecha limite"}`);
  lines.push(`Estado de votacion: ${voting.isClosed ? "Cerrada" : "Abierta"}`);
  if (cohort) {
    lines.push(`Camada activa: ${cohort.name} (${cohort.startDate} -> ${cohort.endDate})`);
  }
  lines.push("");

  for (const support of supports) {
    const approvingEvaluators = support.evaluations
      .filter((item) => item.score >= 7)
      .map((item) => `${item.evaluatorName} (${item.score}/10)`);
    const rejectingEvaluators = support.evaluations
      .filter((item) => item.score < 7)
      .map((item) => `${item.evaluatorName} (${item.score}/10)`);

    lines.push(`## ${support.displayName} (${support.id})`);
    lines.push(`Usuario: ${support.username ? `@${support.username}` : "-"}`);
    lines.push(`Decision final: ${support.decision}`);
    lines.push(
      `Promedio: ${support.averageScore !== null ? support.averageScore.toFixed(2) : "-"}/10 · Evaluaciones: ${support.completedEvaluations}/${support.requiredEvaluations}`
    );
    lines.push(`Aprueban: ${approvingEvaluators.length > 0 ? approvingEvaluators.join(", ") : "Nadie"}`);
    lines.push(`No aprueban: ${rejectingEvaluators.length > 0 ? rejectingEvaluators.join(", ") : "Nadie"}`);
    lines.push(`Pendientes: ${support.pendingEvaluators.length > 0 ? support.pendingEvaluators.join(", ") : "Sin pendientes"}`);
    if (support.autoAveragedMissingVotes > 0) {
      lines.push(`Votos faltantes promediados automaticamente: ${support.autoAveragedMissingVotes}`);
    }
    lines.push(
      `Sanciones: ${support.sanctionsSummary.total} registro(s)${
        support.sanctionsSummary.hasSanctions
          ? ` · Ultimas: ${support.sanctionsSummary.latest
              .map((item) => `${item.fecha || "-"} ${item.appliedSanction}`)
              .join(" | ")}`
          : ""
      }`
    );
    lines.push(
      `Puntos positivos: ${support.positivePointsSummary.totalRecords} registro(s), ${support.positivePointsSummary.totalPoints} punto(s)`
    );

    lines.push("Evaluaciones individuales:");
    if (support.evaluations.length === 0) {
      lines.push("- Sin evaluaciones registradas.");
    } else {
      for (const evaluation of support.evaluations) {
        lines.push(
          `- ${evaluation.evaluatorName}: ${evaluation.score}/10 · ${formatDateTime(evaluation.updatedAt)} · Observaciones: ${evaluation.notes?.trim() || "Sin observaciones"}`
        );
      }
    }

    if (support.positivePointsSummary.latest.length > 0) {
      lines.push("Puntos positivos recientes:");
      for (const point of support.positivePointsSummary.latest) {
        lines.push(
          `- ${point.fecha || "-"} · ${point.pointType} (+${point.pointValue}) · ${point.justificacion}${
            point.observaciones ? ` · Obs: ${point.observaciones}` : ""
          }`
        );
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function PromotionEvaluationPanel() {
  const [supports, setSupports] = useState<SupportEvaluation[]>([]);
  const [secondEvaluation, setSecondEvaluation] = useState<{
    enabled: boolean;
    supports: SecondEvaluationSupport[];
  }>({
    enabled: false,
    supports: [],
  });
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedSupportId, setSelectedSupportId] = useState<string>("");
  const [activePanel, setActivePanel] = useState<DetailPanel>("evaluate");
  const [scoreDraft, setScoreDraft] = useState<Record<string, number>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [votingState, setVotingState] = useState<VotingState>({
    deadlineIso: null,
    isClosed: false,
    managedByDiscordId: null,
  });
  const [cohort, setCohort] = useState<PromotionCohort | null>(null);
  const [canManageDeadline, setCanManageDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [selectedSecondSupportId, setSelectedSecondSupportId] = useState<string>("");

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
      const nextSecondEvaluation = data?.secondEvaluation ?? {
        enabled: false,
        supports: [],
      };
      const nextEvaluators = Array.isArray(data?.evaluators) ? data.evaluators : [];
      const nextVoting = data?.voting ?? {
        deadlineIso: null,
        isClosed: false,
        managedByDiscordId: null,
      };

      setSupports(nextSupports);
      setSecondEvaluation(nextSecondEvaluation);
      setEvaluators(nextEvaluators);
      setVotingState(nextVoting);
      setCohort(data?.cohort ?? null);
      setCanManageDeadline(Boolean(data?.permissions?.canManageDeadline));
      setDeadlineDraft(nextVoting.deadlineIso ? nextVoting.deadlineIso.slice(0, 16) : "");

      setScoreDraft((prev) => {
        const next = { ...prev };
        for (const support of nextSupports) {
          if (!(support.id in next)) {
            next[support.id] = support.myEvaluation?.score ?? 7;
          }
        }
        for (const support of nextSecondEvaluation.supports) {
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
        for (const support of nextSecondEvaluation.supports) {
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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!secondEvaluation.enabled || secondEvaluation.supports.length === 0) {
      setSelectedSecondSupportId("");
      return;
    }

    if (
      !selectedSecondSupportId ||
      !secondEvaluation.supports.some((support) => support.id === selectedSecondSupportId)
    ) {
      setSelectedSecondSupportId(secondEvaluation.supports[0].id);
    }
  }, [secondEvaluation, selectedSecondSupportId]);

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
  const selectedSecondSupport = useMemo(
    () => secondEvaluation.supports.find((support) => support.id === selectedSecondSupportId) ?? null,
    [secondEvaluation.supports, selectedSecondSupportId]
  );
  const secondEvaluationCountdown =
    secondEvaluation.enabled && votingState.deadlineIso
      ? formatCountdown(votingState.deadlineIso, nowMs)
      : null;

  const selectedScore = selectedSupport ? scoreDraft[selectedSupport.id] ?? 7 : 7;
  const selectedZone = getScoreZone(selectedScore);

  async function refreshNow() {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  }

  function downloadReport() {
    const reportContent = buildPromotionReport({
      supports,
      evaluators,
      voting: votingState,
      cohort,
      generatedAt: new Date(),
    });

    const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateTag = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `promotion-evaluation-report-${dateTag}.md`;
    link.click();

    URL.revokeObjectURL(url);
    setMessage("Informe descargado correctamente.");
    setTimeout(() => setMessage(null), 2500);
  }

  async function saveVotingDeadline() {
    setSavingDeadline(true);
    setMessage(null);

    try {
      const response = await fetch("/api/discord/promotion-evaluations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          votingDeadlineIso: deadlineDraft ? new Date(deadlineDraft).toISOString() : null,
        }),
      });

      const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo guardar la fecha limite");
      }

      setMessage("Fecha limite de votacion actualizada.");
      setTimeout(() => setMessage(null), 2600);
      await loadData(false);
    } catch (deadlineError) {
      const deadlineMessage = deadlineError instanceof Error ? deadlineError.message : "Error desconocido";
      setMessage(deadlineMessage);
      setTimeout(() => setMessage(null), 2800);
    } finally {
      setSavingDeadline(false);
    }
  }

  async function saveEvaluation(supportId: string, stage: "first" | "second" = "first") {
    if (stage === "first" && votingState.isClosed) {
      setMessage("La votacion esta cerrada porque ya vencio el plazo.");
      setTimeout(() => setMessage(null), 2600);
      return;
    }

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
          stage,
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

          <div className="flex w-full max-w-xl flex-col gap-2 sm:items-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-neutral-grey)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar support"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_0_3px_rgba(255,172,0,0.08)]"
                />
              </label>

              <button
                type="button"
                onClick={() => void refreshNow()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[var(--color-neutral-white)] transition hover:border-white/30"
                disabled={isRefreshing}
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Actualizando" : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={downloadReport}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/15 px-3 py-2 text-xs font-semibold text-[#ffac00] transition hover:bg-[#ffac00]/25"
              >
                <FileDown className="h-3.5 w-3.5" />
                Descargar informe
              </button>
            </div>

            <div className="flex w-full flex-wrap gap-1.5">
              {[
                { key: "all", label: "Todos" },
                { key: "pending", label: "Pendientes" },
                { key: "passed", label: "Aprueban" },
                { key: "failed", label: "No aprueban" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key as StatusFilter)}
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                    statusFilter === item.key
                      ? "border-[#ffac00]/50 bg-[#ffac00]/15 text-[#ffac00]"
                      : "border-white/[0.08] bg-white/[0.02] text-[var(--color-neutral-grey)] hover:border-white/20"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]"><Users className="h-3 w-3" /> Total supports</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">{totalSupports}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]"><Clock3 className="h-3 w-3" /> Pendientes</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">{pendingSupports}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]"><UserCheck className="h-3 w-3" /> Aprobados</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">{passedSupports}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]"><AlertTriangle className="h-3 w-3" /> Con sanciones</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">{highRiskSupports}</p>
          </div>
        </div>

        <p className="relative z-10 mt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-neutral-grey)]">
          <Star className="h-3.5 w-3.5 text-[#ffac00]" />
          Completadas: {finalizedSupports}/{totalSupports} ({completionPercent}%) · No aprueban: {failedSupports} · Promedio global: {Number.isFinite(averageCompletedScore) ? averageCompletedScore.toFixed(2) : "-"}/10
        </p>

        <div className="relative z-10 mt-4 grid gap-3 xl:grid-cols-2">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">Plazo de votacion</p>
            <p className="mt-1 text-sm text-[var(--color-neutral-white)]">
              {votingState.deadlineIso ? formatDateTime(votingState.deadlineIso) : "Sin fecha limite"}
            </p>
            <p className={`mt-1 text-[11px] ${votingState.isClosed ? "text-[var(--color-accent-red)]" : "text-[var(--color-neutral-grey)]"}`}>
              {votingState.isClosed
                ? "Votacion cerrada: los votos faltantes se promedian automaticamente con el resto del equipo."
                : "Votacion abierta. Al finalizar el plazo, la votacion se cerrara automaticamente."}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-neutral-grey)]">
              Cumplir con los tiempos establecidos es parte de nuestra responsabilidad dentro del staff.
            </p>

            {canManageDeadline ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="datetime-local"
                  value={deadlineDraft}
                  onChange={(e) => setDeadlineDraft(e.target.value)}
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-[var(--color-neutral-white)] outline-none focus:border-[#ffac00]/40"
                />
                <button
                  type="button"
                  onClick={() => void saveVotingDeadline()}
                  disabled={savingDeadline}
                  className="rounded-md border border-[#ffac00]/40 bg-[#ffac00]/15 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#ffac00] transition hover:bg-[#ffac00]/25 disabled:opacity-50"
                >
                  {savingDeadline ? "Guardando..." : "Guardar plazo"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">Camada activa</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">
              {secondEvaluationCountdown ?? "Sin cuenta regresiva activa"}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-neutral-grey)]">
              {votingState.deadlineIso
                ? `Cierre programado: ${formatDateTime(votingState.deadlineIso)}`
                : "No hay fecha limite configurada para la votacion activa."}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-neutral-grey)]">
              {votingState.isClosed ? "La votacion activa ya esta cerrada." : "La votacion activa sigue abierta."}
            </p>
          </div>
        </div>

        {message ? (
          <p className="relative z-10 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-[var(--color-neutral-grey)]">
            {message}
          </p>
        ) : null}

        {loading ? (
          <p className="relative z-10 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-[var(--color-neutral-grey)]">
            Cargando evaluaciones...
          </p>
        ) : null}

        {error ? (
          <p className="relative z-10 mt-4 rounded-xl border border-[var(--color-accent-red)]/40 bg-[var(--color-accent-red)]/12 p-3 text-sm text-[var(--color-accent-red)]">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="relative z-10 mt-5 grid gap-4 grid-cols-[280px_1fr]">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
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
                          : "border-white/[0.08] bg-transparent hover:border-white/15 hover:bg-white/[0.03]"
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
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
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

                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
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
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]">Sanciones</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">
                          {selectedSupport.sanctionsSummary.total}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]">Puntos positivos</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">
                          {selectedSupport.positivePointsSummary.totalPoints}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-neutral-grey)]">Votos promediados</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-white)]">
                          {selectedSupport.autoAveragedMissingVotes}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedSupport.cutStatus && selectedSupport.cutStatus !== "sin_cortes" ? (
                    <div className="mt-4 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">Estado de cortes</p>
                      <div className="space-y-2">
                        <div
                          className={`rounded-md border px-3 py-2 text-[11px] font-medium ${
                            selectedSupport.cutStatus.startsWith("aprobado_corte_1")
                              ? "border-[#34d399]/40 bg-[#34d399]/12 text-[#34d399]"
                              : selectedSupport.cutStatus === "rechazado_corte_1_en_mejora"
                                ? "border-[#facc15]/40 bg-[#facc15]/12 text-[#facc15]"
                                : selectedSupport.cutStatus === "pendiente_corte_1"
                                  ? "border-[#64748b]/40 bg-[#64748b]/12 text-[#cbd5e1]"
                                  : selectedSupport.cutStatus.startsWith("aprobado_corte_2")
                                    ? "border-[#10b981]/40 bg-[#10b981]/12 text-[#10b981]"
                                    : selectedSupport.cutStatus === "rechazado_corte_2_retiro"
                                      ? "border-[#ef4444]/40 bg-[#ef4444]/12 text-[#ef4444]"
                                      : "border-[#64748b]/40 bg-[#64748b]/12 text-[#cbd5e1]"
                          }`}
                        >
                          {selectedSupport.cutStatus === "aprobado_corte_1"
                            ? "✓ Aprobó Corte 1"
                            : selectedSupport.cutStatus === "rechazado_corte_1_en_mejora"
                              ? "⚠ Rechazó Corte 1 - Período de mejora"
                              : selectedSupport.cutStatus === "pendiente_corte_1"
                                ? "○ Pendiente Corte 1"
                                : selectedSupport.cutStatus === "aprobado_corte_2"
                                  ? "✓ Aprobó Corte 2"
                                  : selectedSupport.cutStatus === "rechazado_corte_2_retiro"
                                    ? "✗ Rechazó Corte 2 - Retiro"
                                    : "○ Pendiente Corte 2"}
                        </div>
                        {selectedSupport.inImprovementPeriod ? (
                          <div className="rounded-md border border-[#facc15]/40 bg-[#facc15]/12 px-3 py-2 flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-[#facc15] shrink-0" />
                            <p className="text-[10px] text-[#facc15]">
                              En período de mejora · Próximo corte: Corte 2
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {activePanel !== "evaluate" ? (
                    <div className="mt-4 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">
                          {activePanel === "sanctions" ? "Historial de sanciones" : "Historial de puntos positivos"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setActivePanel("evaluate")}
                          className="rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)] transition hover:border-white/25 hover:text-[var(--color-neutral-white)]"
                        >
                          Volver
                        </button>
                      </div>

                      {activePanel === "sanctions" ? (
                        <div className="max-h-48 overflow-auto">
                          {selectedSupport.sanctionsSummary.hasSanctions ? (
                            <table className="w-full text-[10px]">
                              <tbody>
                                {selectedSupport.sanctionsSummary.latest.map((item, index) => (
                                  <tr key={index} className="border-b border-white/[0.06] text-[var(--color-neutral-grey)] last:border-0">
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
                        <div className="max-h-56 space-y-2 overflow-auto">
                          {selectedSupport.positivePointsSummary.hasPositivePoints ? (
                            selectedSupport.positivePointsSummary.latest.map((item, index) => (
                              <div key={index} className="rounded-md border border-white/[0.08] bg-white/[0.02] p-2 text-[10px] text-[var(--color-neutral-grey)]">
                                <p className="font-semibold text-[var(--color-neutral-white)]">
                                  {item.pointType} (+{item.pointValue})
                                </p>
                                <p className="mt-0.5">{item.fecha || "-"}</p>
                                <p className="mt-1">{item.justificacion}</p>
                                {item.observaciones ? <p className="mt-1">Obs: {item.observaciones}</p> : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-[var(--color-neutral-grey)]">Sin puntos positivos registrados.</p>
                          )}
                        </div>
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
                          <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
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
                                className="w-18 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-center text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#ffac00]/40"
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

                            <p className="text-[11px] text-[var(--color-neutral-grey)]">
                              {scoreZoneLabel[selectedZone]}
                            </p>

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
                              className="min-h-20 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-[var(--color-neutral-white)] placeholder-[var(--color-neutral-grey)]/60 outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_0_3px_rgba(255,172,0,0.08)]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => saveEvaluation(selectedSupport.id)}
                            disabled={savingId === selectedSupport.id || votingState.isClosed}
                            className="w-full rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#ffac00] transition-all hover:border-[#ffac00]/60 hover:bg-[#ffac00]/30 disabled:opacity-50"
                          >
                            {savingId === selectedSupport.id
                              ? "Guardando evaluación..."
                              : votingState.isClosed
                                ? "Votación cerrada"
                                : "Guardar evaluación"}
                          </button>

                        </>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setActivePanel("sanctions")}
                          className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-neutral-grey)] transition hover:border-white/20 hover:bg-white/10 hover:text-[var(--color-neutral-white)]"
                        >
                          Ver sanciones • {selectedSupport.sanctionsSummary.total}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePanel("positivePoints")}
                          className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-neutral-grey)] transition hover:border-white/20 hover:bg-white/10 hover:text-[var(--color-neutral-white)]"
                        >
                          Ver puntos positivos • {selectedSupport.positivePointsSummary.totalRecords}
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>

            {secondEvaluation.enabled ? (
              <div className="relative z-10 mt-6 rounded-xl border border-[#f59e0b]/25 bg-[#f59e0b]/8 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#fbbf24]">Segunda evaluación</p>
                    <h3 className="mt-1 text-base font-semibold text-[var(--color-neutral-white)]">Supports que no pasaron el cierre inicial</h3>
                    <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                      Segunda evaluación activa: vuelve a calificar desde cero y revisa el historial de la ronda anterior antes de emitir tu voto.
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                      Cierre segunda evaluación: {votingState.deadlineIso ? formatDateTime(votingState.deadlineIso) : "Sin fecha limite"}
                      {secondEvaluationCountdown ? ` · Cuenta regresiva: ${secondEvaluationCountdown}` : ""}
                    </p>
                  </div>
                  <span className="rounded-md border border-[#f59e0b]/35 bg-[#f59e0b]/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#fbbf24]">
                    {secondEvaluation.supports.length} pendiente(s)
                  </span>
                </div>

                {secondEvaluation.supports.length === 0 ? (
                  <p className="mt-3 text-xs text-[var(--color-neutral-grey)]">
                    No hay supports pendientes para Segunda evaluación.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[260px_1fr]">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2">
                      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {secondEvaluation.supports.map((support) => (
                          <button
                            key={support.id}
                            type="button"
                            onClick={() => setSelectedSecondSupportId(support.id)}
                            className={`w-full rounded-md border px-2.5 py-2 text-left text-[11px] transition ${
                              selectedSecondSupportId === support.id
                                ? "border-[#f59e0b]/45 bg-[#f59e0b]/12"
                                : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                            }`}
                          >
                            <p className="truncate font-semibold text-[var(--color-neutral-white)]">{support.displayName}</p>
                            <p className="mt-0.5 truncate text-[10px] text-[var(--color-neutral-grey)]">
                              {support.username ? `@${support.username}` : support.id}
                            </p>
                            <p className="mt-1 text-[10px] text-[var(--color-neutral-grey)]">
                              Nueva ronda: {support.completedEvaluations}/{support.requiredEvaluations}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                      {!selectedSecondSupport ? (
                        <p className="text-xs text-[var(--color-neutral-grey)]">Selecciona un support para evaluar.</p>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-[var(--color-neutral-white)]">{selectedSecondSupport.displayName}</h4>
                            <p className="mt-1 text-[11px] text-[var(--color-neutral-grey)]">
                              {selectedSecondSupport.username ? `@${selectedSecondSupport.username}` : selectedSecondSupport.id}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-neutral-grey)]">
                              Ronda anterior: promedio {selectedSecondSupport.previousRound.averageScore !== null ? selectedSecondSupport.previousRound.averageScore.toFixed(2) : "-"}/10 · evaluaciones {selectedSecondSupport.previousRound.completedEvaluations}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-neutral-grey)]">
                              Faltan por votar: {selectedSecondSupport.pendingEvaluators.length > 0 ? selectedSecondSupport.pendingEvaluators.join(", ") : "Sin pendientes"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">Evaluación anterior (historial)</p>
                            {selectedSecondSupport.previousRound.evaluations.length === 0 ? (
                              <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">Sin evaluaciones históricas registradas.</p>
                            ) : (
                              <div className="mt-2 max-h-40 space-y-2 overflow-auto pr-1">
                                {selectedSecondSupport.previousRound.evaluations.map((item, index) => (
                                  <div key={`${item.evaluatorName}-${index}`} className="rounded-md border border-white/[0.08] bg-white/[0.02] p-2 text-[11px]">
                                    <p className="font-semibold text-[var(--color-neutral-white)]">{item.evaluatorName}: {item.score}/10</p>
                                    <p className="mt-0.5 text-[10px] text-[var(--color-neutral-grey)]">{formatDateTime(item.updatedAt)}</p>
                                    <p className="mt-1 text-[var(--color-neutral-grey)]">{item.notes?.trim() || "Sin observaciones"}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {selectedSecondSupport.myEvaluation ? (
                            <div className="rounded-lg border border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/10 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-green)]">
                                ✓ Ya registraste tu Segunda evaluación
                              </p>
                              <p className="mt-1 text-sm font-bold text-[var(--color-neutral-white)]">
                                {selectedSecondSupport.myEvaluation.score}/10
                              </p>
                              {selectedSecondSupport.myEvaluation.notes ? (
                                <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">{selectedSecondSupport.myEvaluation.notes}</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-grey)]">Mi nueva evaluación</label>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                step={1}
                                value={scoreDraft[selectedSecondSupport.id] ?? 7}
                                onChange={(e) =>
                                  setScoreDraft((prev) => ({
                                    ...prev,
                                    [selectedSecondSupport.id]: clampScore(Number(e.target.value)),
                                  }))
                                }
                                className="w-24 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[#f59e0b]/45"
                              />
                              <textarea
                                value={notesDraft[selectedSecondSupport.id] ?? ""}
                                onChange={(e) =>
                                  setNotesDraft((prev) => ({
                                    ...prev,
                                    [selectedSecondSupport.id]: e.target.value,
                                  }))
                                }
                                placeholder="Comentarios de esta nueva ronda"
                                className="min-h-20 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-neutral-white)] outline-none focus:border-[#f59e0b]/45"
                              />
                              <button
                                type="button"
                                onClick={() => saveEvaluation(selectedSecondSupport.id, "second")}
                                disabled={savingId === selectedSecondSupport.id}
                                className="rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#fbbf24] transition hover:bg-[#f59e0b]/25 disabled:opacity-50"
                              >
                                {savingId === selectedSecondSupport.id ? "Guardando..." : "Guardar Segunda evaluación"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </UICard>
  );
}
