"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Download,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type Evaluation = {
  postulacionIndex: string;
  evaluatorDiscordId: string;
  evaluatorName: string;
  score: number;
  comentarios: string | null;
  createdAt: string;
};

type PostulacionRow = {
  rowData: string[];
  rowIndex: string;
  evaluations: Evaluation[];
  averageScore: number | null;
  currentUserVote: { score: number; comentarios: string | null } | null;
};

type PostulacionesResponse = {
  headers?: string[];
  rows?: PostulacionRow[];
  votingDeadline?: string | null;
  votingClosed?: boolean;
  resultsReady?: boolean;
  expectedEvaluators?: Array<{ discordId: string; name: string; roles: string[] }>;
  fetchedAt?: string;
  error?: string;
};

const REFRESH_INTERVAL_MS = 30_000;

type FilterMode = "all" | "pending-mine" | "voted-mine" | "without-votes";
type SortMode = "recent" | "average-desc" | "average-asc" | "name-asc";

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

function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!deadline) {
      return undefined;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
      });
    };

    if (document.hidden) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateCountdown();
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [deadline]);

  return timeLeft;
}

function computeAverage(scores: number[]) {
  if (scores.length === 0) {
    return null;
  }

  const total = scores.reduce((acc, current) => acc + current, 0);
  return Number((total / scores.length).toFixed(2));
}

export function PostulacionesPanel() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PostulacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [votingDeadline, setVotingDeadline] = useState<string | null>(null);
  const [votingClosed, setVotingClosed] = useState(false);
  const [resultsReady, setResultsReady] = useState(false);
  const [expectedEvaluators, setExpectedEvaluators] = useState<Array<{ discordId: string; name: string; roles: string[] }>>([]);
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);
  const [votingRowIndex, setVotingRowIndex] = useState<string | null>(null);
  const [votingScore, setVotingScore] = useState<number>(0);
  const [votingComentarios, setVotingComentarios] = useState("");
  const [votingLoading, setVotingLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const countdown = useCountdown(votingDeadline);

  const loadPostulaciones = useCallback(async (showRefreshingState: boolean) => {
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
      setVotingDeadline(data.votingDeadline ?? null);
      setVotingClosed(Boolean(data.votingClosed));
      setResultsReady(Boolean(data.resultsReady));
      setExpectedEvaluators(Array.isArray(data.expectedEvaluators) ? data.expectedEvaluators : []);
      setLastSyncAt(data.fetchedAt ?? new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const submitVote = useCallback(async () => {
    if (!votingRowIndex || votingScore === 0) {
      return;
    }

    setVotingLoading(true);

    try {
      const response = await fetch("/api/discord/postulaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postulacionIndex: votingRowIndex,
          score: votingScore,
          comentarios: votingComentarios || null,
        }),
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al guardar la evaluación");
      }

      setVotingRowIndex(null);
      setVotingScore(0);
      setVotingComentarios("");
      setVotingLoading(false);

      await loadPostulaciones(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setVotingLoading(false);
    }
  }, [votingRowIndex, votingScore, votingComentarios, loadPostulaciones]);

  useEffect(() => {
    loadPostulaciones(false);

    const intervalId = window.setInterval(() => {
      loadPostulaciones(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadPostulaciones]);

  const tableHeaders = useMemo(() => {
    if (headers.length > 0) {
      return headers;
    }

    if (rows.length > 0) {
      return rows[0].rowData.map((_, idx) => `Columna ${idx + 1}`);
    }

    return [];
  }, [headers, rows]);

  const votingActive = Boolean(!votingClosed && !countdown?.isExpired && votingDeadline);

  const normalizedQuery = query.trim().toLowerCase();

  const rowsWithComputed = useMemo(() => {
    return rows.map((row, index) => {
      const submittedAt = row.rowData[0] ?? "";
      const displayName = row.rowData[1]?.trim() || row.rowData[0] || `Postulacion ${index + 1}`;
      const liveAverage = computeAverage(row.evaluations.map((evaluation) => evaluation.score));

      return {
        ...row,
        orderIndex: index,
        submittedAt,
        displayName,
        liveAverage,
      };
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const withFilters = rowsWithComputed.filter((row) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.displayName.toLowerCase().includes(normalizedQuery) ||
        row.rowData.join(" ").toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }

      if (filterMode === "pending-mine") {
        return votingActive && !row.currentUserVote;
      }

      if (filterMode === "voted-mine") {
        return Boolean(row.currentUserVote);
      }

      if (filterMode === "without-votes") {
        return row.evaluations.length === 0;
      }

      return true;
    });

    return withFilters.sort((left, right) => {
      if (sortMode === "name-asc") {
        return left.displayName.localeCompare(right.displayName, "es");
      }

      if (sortMode === "average-desc") {
        const leftScore = left.liveAverage ?? -1;
        const rightScore = right.liveAverage ?? -1;
        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }
        return left.orderIndex - right.orderIndex;
      }

      if (sortMode === "average-asc") {
        const leftScore = left.liveAverage ?? Number.POSITIVE_INFINITY;
        const rightScore = right.liveAverage ?? Number.POSITIVE_INFINITY;
        if (leftScore !== rightScore) {
          return leftScore - rightScore;
        }
        return left.orderIndex - right.orderIndex;
      }

      return left.orderIndex - right.orderIndex;
    });
  }, [filterMode, normalizedQuery, rowsWithComputed, sortMode, votingActive]);

  const globalStats = useMemo(() => {
    const total = rowsWithComputed.length;
    const votedByMe = rowsWithComputed.filter((row) => Boolean(row.currentUserVote)).length;
    const withoutVotes = rowsWithComputed.filter((row) => row.evaluations.length === 0).length;

    const scoreAccumulator = rowsWithComputed.reduce(
      (acc, row) => {
        for (const evaluation of row.evaluations) {
          acc.totalVotes += 1;
          acc.totalScore += evaluation.score;
        }
        return acc;
      },
      { totalVotes: 0, totalScore: 0 }
    );

    const overallAverage =
      scoreAccumulator.totalVotes > 0
        ? Number((scoreAccumulator.totalScore / scoreAccumulator.totalVotes).toFixed(2))
        : null;

    return {
      total,
      votedByMe,
      withoutVotes,
      totalVotes: scoreAccumulator.totalVotes,
      overallAverage,
    };
  }, [rowsWithComputed]);

  const visibleIndexes = useMemo(() => filteredRows.map((row) => row.rowIndex), [filteredRows]);
  const expandedVisiblePosition = expandedIndex ? visibleIndexes.indexOf(expandedIndex) : -1;

  const handleToggleExpand = useCallback((rowIndex: string, isExpanded: boolean) => {
    setExpandedIndex(isExpanded ? null : rowIndex);
  }, []);

  const handleStartVote = useCallback((rowIndex: string, currentScore: number, currentComentarios: string | null) => {
    setVotingRowIndex(rowIndex);
    setVotingScore(currentScore);
    setVotingComentarios(currentComentarios || "");
  }, []);

  const handleCancelVote = useCallback(() => {
    setVotingRowIndex(null);
    setVotingScore(0);
    setVotingComentarios("");
  }, []);

  const handleSetVotingScore = useCallback((score: number) => {
    setVotingScore(score);
  }, []);

  const openFirstVisible = useCallback(() => {
    if (visibleIndexes.length > 0) {
      setExpandedIndex(visibleIndexes[0]);
    }
  }, [visibleIndexes]);

  const openPreviousVisible = useCallback(() => {
    if (visibleIndexes.length === 0) {
      return;
    }

    if (expandedVisiblePosition <= 0) {
      setExpandedIndex(visibleIndexes[0]);
      return;
    }

    setExpandedIndex(visibleIndexes[expandedVisiblePosition - 1]);
  }, [expandedVisiblePosition, visibleIndexes]);

  const openNextVisible = useCallback(() => {
    if (visibleIndexes.length === 0) {
      return;
    }

    if (expandedVisiblePosition === -1) {
      setExpandedIndex(visibleIndexes[0]);
      return;
    }

    const nextPosition = Math.min(expandedVisiblePosition + 1, visibleIndexes.length - 1);
    setExpandedIndex(visibleIndexes[nextPosition]);
  }, [expandedVisiblePosition, visibleIndexes]);

  useEffect(() => {
    if (expandedIndex && !visibleIndexes.includes(expandedIndex)) {
      setExpandedIndex(null);
    }
  }, [expandedIndex, visibleIndexes]);

  if (loading) {
    return (
      <UICard className="col-span-full">
        <div className="flex items-center justify-center py-16 text-sm text-(--color-neutral-grey)">
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-(--color-neutral-grey)/80">
            Postulaciones en tiempo real
          </p>
          <p className="mt-1 text-xs text-(--color-neutral-grey)">
            Última sincronización: {formatDateTime(lastSyncAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {votingDeadline && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-(--color-neutral-grey)/80">
                {votingClosed || countdown?.isExpired ? "Votación cerrada" : "Tiempo hasta cierre"}
              </p>
              {countdown && (
                <p
                  className={`mt-1 text-sm font-mono font-bold ${
                    votingClosed || countdown.isExpired
                      ? "text-[#fb7185]"
                      : countdown.days === 0 && countdown.hours === 0
                        ? "text-[#facc15]"
                        : "text-[#34d399]"
                  }`}
                >
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                </p>
              )}
            </div>
          )}

          {votingClosed && resultsReady && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/discord/postulaciones-results";
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[#34d399]/40 bg-[#34d399]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399] transition-colors hover:bg-[#34d399]/20"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar resultados
            </button>
          )}

          {!votingClosed && (
            <button
              type="button"
              onClick={() => loadPostulaciones(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-neutral-white) transition-colors hover:bg-white/8"
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando" : "Actualizar"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 border-b border-white/8 px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/2 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-(--color-neutral-grey)/70">Postulaciones</p>
            <p className="mt-1 text-xl font-semibold text-(--color-neutral-white)">{globalStats.total}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/2 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-(--color-neutral-grey)/70">Mi progreso</p>
            <p className="mt-1 text-xl font-semibold text-[#34d399]">{globalStats.votedByMe}/{globalStats.total}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/2 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-(--color-neutral-grey)/70">Promedio global</p>
            <p className="mt-1 text-xl font-semibold text-[#ffac00]">{globalStats.overallAverage !== null ? globalStats.overallAverage.toFixed(2) : "-"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/2 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-(--color-neutral-grey)/70">Sin votos</p>
            <p className="mt-1 text-xl font-semibold text-[#facc15]">{globalStats.withoutVotes}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-55 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--color-neutral-grey)/70" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o respuesta..."
              className="w-full rounded-lg border border-white/10 bg-white/3 py-2 pl-9 pr-3 text-xs text-(--color-neutral-white) placeholder-(--color-neutral-grey)/70 focus:border-[#34d399]/50 focus:outline-none"
            />
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/3 p-1">
            {[
              { value: "all", label: "Todas" },
              { value: "pending-mine", label: "Pendientes" },
              { value: "voted-mine", label: "Votadas" },
              { value: "without-votes", label: "Sin votos" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilterMode(option.value as FilterMode)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  filterMode === option.value
                    ? "bg-[#34d399]/25 text-[#34d399]"
                    : "text-(--color-neutral-grey) hover:bg-white/8"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-2 py-1.5">
            <ArrowDownUp className="h-3.5 w-3.5 text-(--color-neutral-grey)" />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="bg-transparent text-xs text-(--color-neutral-white) focus:outline-none"
            >
              <option className="bg-[#131625]" value="recent">Orden original</option>
              <option className="bg-[#131625]" value="average-desc">Promedio: mayor a menor</option>
              <option className="bg-[#131625]" value="average-asc">Promedio: menor a mayor</option>
              <option className="bg-[#131625]" value="name-asc">Nombre A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-(--color-neutral-grey)">
            Mostrando {filteredRows.length} de {rows.length} postulaciones
          </p>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={openFirstVisible}
              className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-(--color-neutral-grey) transition-colors hover:bg-white/8"
              disabled={filteredRows.length === 0}
            >
              Abrir primera
            </button>
            <button
              type="button"
              onClick={openPreviousVisible}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-(--color-neutral-grey) transition-colors hover:bg-white/8 disabled:opacity-50"
              disabled={filteredRows.length === 0}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <button
              type="button"
              onClick={openNextVisible}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-(--color-neutral-grey) transition-colors hover:bg-white/8 disabled:opacity-50"
              disabled={filteredRows.length === 0}
            >
              Siguiente
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-(--color-neutral-grey)">
          No hay respuestas registradas todavía.
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-(--color-neutral-grey)">
          No hay resultados con los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {filteredRows.map((row) => {
            const isExpanded = expandedIndex === row.rowIndex;
            const isVoting = votingRowIndex === row.rowIndex;
            const submittedAt = row.submittedAt || "-";
            const displayName = row.displayName;
            const panelId = `postulacion-panel-${row.rowIndex}`;

            const baseTotalScore = row.evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0);
            const baseVotesCount = row.evaluations.length;

            let liveAverage = computeAverage(row.evaluations.map((evaluation) => evaluation.score));

            if (isVoting && votingScore > 0) {
              if (row.currentUserVote) {
                const projectedTotal = baseTotalScore - row.currentUserVote.score + votingScore;
                liveAverage = baseVotesCount > 0 ? Number((projectedTotal / baseVotesCount).toFixed(2)) : null;
              } else {
                const projectedTotal = baseTotalScore + votingScore;
                const projectedCount = baseVotesCount + 1;
                liveAverage = Number((projectedTotal / projectedCount).toFixed(2));
              }
            }

            const pendingVotes = Math.max(expectedEvaluators.length - row.evaluations.length, 0);

            return (
              <UICard
                key={row.rowIndex}
                className={`border-white/10 bg-white/2 p-4 transition-colors ${
                  isExpanded ? "border-[#34d399]/50" : "hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white/6 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-(--color-neutral-grey)">
                        #{Number(row.rowIndex) + 1}
                      </span>
                      {isExpanded ? (
                        <ArrowDownAZ className="h-3.5 w-3.5 text-(--color-neutral-grey)/70" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-(--color-neutral-grey)/70" />
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-(--color-neutral-white) line-clamp-2">
                      {displayName}
                    </p>
                    <p className="mt-1 text-xs text-(--color-neutral-grey)">
                      {formatDateTime(submittedAt)}
                    </p>
                    <p className="mt-1 text-xs text-(--color-neutral-grey)">
                      {row.evaluations.length} evaluaci{row.evaluations.length !== 1 ? "ones" : "on"}
                      {expectedEvaluators.length > 0 ? ` · ${pendingVotes} pendientes` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {liveAverage !== null && (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#ffac00]">{liveAverage.toFixed(2)}</p>
                          <p className="text-[10px] text-(--color-neutral-grey)">/ 5</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= Math.round(liveAverage)
                                  ? "fill-[#ffac00] text-[#ffac00]"
                                  : "text-(--color-neutral-grey)/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleExpand(row.rowIndex, isExpanded)}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Spacebar") {
                          event.preventDefault();
                        }
                      }}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      className="rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--color-neutral-grey) transition-colors hover:bg-white/8"
                    >
                      {isExpanded ? "Cerrar detalle" : "Ver detalle"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div id={panelId} className="mt-4 border-t border-white/8 pt-4 space-y-4">
                    {votingClosed && !resultsReady && (
                      <div className="rounded-lg border border-[#facc15]/35 bg-[#facc15]/12 px-3 py-2 text-xs text-[#ffe7a3]">
                        Cerrando votacion y consolidando resultados...
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">
                        Respuestas del formulario
                      </p>
                      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-white/2 p-3">
                        {tableHeaders.map((header, idx) => {
                          const value = row.rowData[idx] ?? "";

                          return (
                            <div key={`${row.rowIndex}-field-${idx}`} className="rounded-md bg-white/3 p-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--color-neutral-grey)/70">
                                {header}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap wrap-break-word text-xs text-(--color-neutral-white)">
                                {value.trim().length > 0 ? value : "-"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Estado de evaluadores */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">
                        Estado de evaluadores ({row.evaluations.length}/{expectedEvaluators.length})
                      </p>
                      <div className="space-y-2">
                        {/* Evaluadores que votaron */}
                        {row.evaluations.map((evaluation, idx) => (
                          <div key={`voted-${idx}`} className="rounded-lg bg-white/3 p-3 text-xs border-l-2 border-[#34d399]">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-[#34d399]">✓ {evaluation.evaluatorName}</p>
                                <div className="mt-1 flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-2.5 w-2.5 ${
                                        i < evaluation.score
                                          ? "fill-[#34d399] text-[#34d399]"
                                          : "text-(--color-neutral-grey)/30"
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-1 font-bold text-[#34d399]">{evaluation.score}/5</span>
                                </div>
                                {evaluation.comentarios && (
                                  <p className="mt-1 text-[10px] text-(--color-neutral-grey)">
                                    Observación: "{evaluation.comentarios}"
                                  </p>
                                )}
                                <p className="mt-1 text-[10px] text-(--color-neutral-grey)/60">
                                  {formatDateTime(evaluation.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Evaluadores que no votaron */}
                        {row.evaluations.length < expectedEvaluators.length && (
                          (() => {
                            const votedIds = new Set(row.evaluations.map((e) => e.evaluatorDiscordId));
                            const pending = expectedEvaluators.filter((e) => !votedIds.has(e.discordId));

                            return (
                              <div className="rounded-lg bg-white/3 p-3 text-xs border-l-2 border-[#fb7185]">
                                <p className="font-semibold text-[#fb7185]">
                                  ✗ Pendiente de votación ({pending.length})
                                </p>
                                <div className="mt-2 space-y-1">
                                  {pending.map((evaluator) => (
                                    <p key={evaluator.discordId} className="text-[10px] text-(--color-neutral-grey)">
                                      • {evaluator.name}
                                    </p>
                                  ))}
                                </div>
                                <p className="mt-2 text-[10px] text-(--color-neutral-grey)">
                                  El promedio se calcula automaticamente con los votos registrados
                                </p>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>

                    {/* Evaluaciones existentes */}
                    {row.evaluations.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-neutral-grey)/60">
                          Evaluaciones ({row.evaluations.length})
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {row.evaluations.map((evaluation, idx) => (
                            <div key={idx} className="rounded-lg bg-white/3 p-3 text-xs">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-(--color-neutral-white)">
                                  {evaluation.evaluatorName}
                                </p>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < evaluation.score
                                          ? "fill-[#ffac00] text-[#ffac00]"
                                          : "text-(--color-neutral-grey)/30"
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-2 font-bold text-[#ffac00]">{evaluation.score}</span>
                                </div>
                              </div>
                              {evaluation.comentarios && (
                                <p className="mt-1 text-(--color-neutral-grey)">{evaluation.comentarios}</p>
                              )}
                              <p className="mt-1 text-[10px] text-(--color-neutral-grey)/60">
                                {formatDateTime(evaluation.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Form de votación */}
                    {votingActive && (
                      <div className="rounded-lg border border-white/10 bg-white/2 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-(--color-neutral-grey)/70">
                          Promedio en vivo
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#ffac00]">
                          {liveAverage !== null ? liveAverage.toFixed(2) : "Sin votos"}
                          {isVoting && votingScore > 0 ? " (incluye mi seleccion actual)" : ""}
                        </p>
                      </div>
                    )}

                    {votingActive && !isVoting && (
                      <button
                        type="button"
                        onClick={() => {
                          handleStartVote(row.rowIndex, row.currentUserVote?.score || 0, row.currentUserVote?.comentarios || null);
                        }}
                        className="w-full rounded-lg border border-[#34d399]/40 bg-[#34d399]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399] transition-colors hover:bg-[#34d399]/20"
                      >
                        {row.currentUserVote ? "Editar mi voto" : "Votar"}
                      </button>
                    )}

                    {/* Voting UI */}
                    {isVoting && (
                      <div className="mt-4 space-y-3 rounded-lg bg-white/3 p-4">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-neutral-grey)">
                            Mi calificacion
                          </p>
                          <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handleSetVotingScore(score)}
                                className={`rounded-lg px-3 py-2 font-bold transition-all ${
                                  votingScore === score
                                    ? "bg-[#ffac00]/40 text-[#ffac00]"
                                    : "bg-white/5 text-(--color-neutral-grey) hover:bg-white/10"
                                }`}
                              >
                                <Star
                                  className={`inline h-4 w-4 ${
                                    votingScore >= score ? "fill-current" : ""
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-(--color-neutral-grey)">
                            Comentarios (opcional)
                          </label>
                          <textarea
                            value={votingComentarios}
                            onChange={(e) => setVotingComentarios(e.target.value)}
                            className="mt-2 w-full rounded-lg bg-white/5 p-2 text-xs text-(--color-neutral-white) placeholder-(--color-neutral-grey)/50 focus:outline-none focus:ring-1 focus:ring-[#ffac00]"
                            placeholder="Agrega comentarios opcionales..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCancelVote}
                            className="flex-1 rounded-lg border border-(--color-neutral-grey)/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-neutral-grey) transition-colors hover:bg-white/5"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={submitVote}
                            disabled={votingScore === 0 || votingLoading}
                            className="flex-1 rounded-lg bg-[#34d399]/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399] transition-colors hover:bg-[#34d399]/60 disabled:opacity-50"
                          >
                            {votingLoading ? "Guardando..." : "Guardar voto"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </UICard>
            );
          })}
        </div>
      )}
    </UICard>
  );
}

