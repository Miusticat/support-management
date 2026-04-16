"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Star } from "lucide-react";
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
  expectedEvaluators?: Array<{ role: string; level: number }>;
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

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [deadline]);

  return timeLeft;
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
  const [expectedEvaluators, setExpectedEvaluators] = useState<Array<{ role: string; level: number }>>([]);
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);
  const [votingRowIndex, setVotingRowIndex] = useState<string | null>(null);
  const [votingScore, setVotingScore] = useState<number>(0);
  const [votingComentarios, setVotingComentarios] = useState("");
  const [votingLoading, setVotingLoading] = useState(false);

  const countdown = useCountdown(votingDeadline);

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
  }

  async function submitVote() {
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
      return rows[0].rowData.map((_, idx) => `Columna ${idx + 1}`);
    }

    return [];
  }, [headers, rows]);

  const votingActive = Boolean(!votingClosed && !countdown?.isExpired && votingDeadline);

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

        <div className="flex flex-wrap items-center gap-3">
          {votingDeadline && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/80">
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
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-white)] transition-colors hover:bg-white/[0.08]"
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando" : "Actualizar"}
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-[var(--color-neutral-grey)]">
          No hay respuestas registradas todavía.
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {rows.map((row) => {
            const isExpanded = expandedIndex === row.rowIndex;
            const isVoting = votingRowIndex === row.rowIndex;
            const submittedAt = row.rowData[0] ?? "-";
            const displayName = row.rowData[1]?.trim() || row.rowData[0] || "Sin título";

            return (
              <UICard
                key={row.rowIndex}
                className="border-white/10 bg-white/[0.02] p-4 hover:border-white/20"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : row.rowIndex)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-neutral-white)] line-clamp-2">
                        {displayName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                        {formatDateTime(submittedAt)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                        {row.evaluations.length} evaluaci{row.evaluations.length !== 1 ? "ones" : "ón"}
                      </p>
                    </div>

                    {row.averageScore !== null && (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#ffac00]">{row.averageScore.toFixed(2)}</p>
                          <p className="text-[10px] text-[var(--color-neutral-grey)]">/ 5</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= Math.round(row.averageScore || 0)
                                  ? "fill-[#ffac00] text-[#ffac00]"
                                  : "text-[var(--color-neutral-grey)]/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-white/[0.08] pt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/60">
                          Respuestas del formulario
                    {votingClosed && !resultsReady && (
                      <div className="mt-3 rounded-lg border border-[#facc15]/35 bg-[#facc15]/12 px-3 py-2 text-xs text-[#ffe7a3]">
                        Cerrando votación y consolidando resultados...
                      </div>
                    )}

                        </p>
                        <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-white/[0.02] p-3">
                          {tableHeaders.map((header, idx) => {
                            const value = row.rowData[idx] ?? "";

                            return (
                              <div key={`${row.rowIndex}-field-${idx}`} className="rounded-md bg-white/[0.03] p-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]/70">
                                  {header}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-[var(--color-neutral-white)]">
                                  {value.trim().length > 0 ? value : "-"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Estado de evaluadores */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/60">
                          Estado de evaluadores ({row.evaluations.length}/{expectedEvaluators.length})
                        </p>
                        <div className="space-y-2">
                          {/* Evaluadores que votaron */}
                          {row.evaluations.map((evaluation, idx) => (
                            <div key={`voted-${idx}`} className="rounded-lg bg-white/[0.03] p-3 text-xs border-l-2 border-[#34d399]">
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
                                            : "text-[var(--color-neutral-grey)]/30"
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-1 font-bold text-[#34d399]">{evaluation.score}/5</span>
                                  </div>
                                  {evaluation.comentarios && (
                                    <p className="mt-1 text-[10px] text-[var(--color-neutral-grey)]">
                                      Observación: "{evaluation.comentarios}"
                                    </p>
                                  )}
                                  <p className="mt-1 text-[10px] text-[var(--color-neutral-grey)]/60">
                                    {formatDateTime(evaluation.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Evaluadores que no votaron */}
                          {row.evaluations.length < expectedEvaluators.length && (
                            <div className="rounded-lg bg-white/[0.03] p-3 text-xs border-l-2 border-[#fb7185]">
                              <p className="font-semibold text-[#fb7185]">
                                ✗ {expectedEvaluators.length - row.evaluations.length} evaluador(es) pendiente(s) de votar
                              </p>
                              <p className="mt-1 text-[10px] text-[var(--color-neutral-grey)]">
                                El promedio se calculará solo con los votos registrados
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Evaluaciones existentes */}
                      {row.evaluations.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]/60">
                            Evaluaciones ({row.evaluations.length})
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {row.evaluations.map((evaluation, idx) => (
                              <div key={idx} className="rounded-lg bg-white/[0.03] p-3 text-xs">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-[var(--color-neutral-white)]">
                                    {evaluation.evaluatorName}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          i < evaluation.score
                                            ? "fill-[#ffac00] text-[#ffac00]"
                                            : "text-[var(--color-neutral-grey)]/30"
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-2 font-bold text-[#ffac00]">{evaluation.score}</span>
                                  </div>
                                </div>
                                {evaluation.comentarios && (
                                  <p className="mt-1 text-[var(--color-neutral-grey)]">{evaluation.comentarios}</p>
                                )}
                                <p className="mt-1 text-[10px] text-[var(--color-neutral-grey)]/60">
                                  {formatDateTime(evaluation.createdAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Form de votación */}
                      {votingActive && !isVoting && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVotingRowIndex(row.rowIndex);
                            setVotingScore(row.currentUserVote?.score || 0);
                            setVotingComentarios(row.currentUserVote?.comentarios || "");
                          }}
                          className="w-full rounded-lg border border-[#34d399]/40 bg-[#34d399]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399] transition-colors hover:bg-[#34d399]/20"
                        >
                          {row.currentUserVote ? "Editar mi voto" : "Votar"}
                        </button>
                      )}

                      {/* Voting UI */}
                      {isVoting && (
                        <div
                          className="mt-4 space-y-3 rounded-lg bg-white/[0.03] p-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]">
                              Mi calificación
                            </p>
                            <div className="flex gap-3">
                              {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => setVotingScore(score)}
                                  className={`rounded-lg px-3 py-2 font-bold transition-all ${
                                    votingScore === score
                                      ? "bg-[#ffac00]/40 text-[#ffac00]"
                                      : "bg-white/[0.05] text-[var(--color-neutral-grey)] hover:bg-white/[0.1]"
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
                            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]">
                              Comentarios (opcional)
                            </label>
                            <textarea
                              value={votingComentarios}
                              onChange={(e) => setVotingComentarios(e.target.value)}
                              className="mt-2 w-full rounded-lg bg-white/[0.05] p-2 text-xs text-[var(--color-neutral-white)] placeholder-[var(--color-neutral-grey)]/50 focus:outline-none focus:ring-1 focus:ring-[#ffac00]"
                              placeholder="Agrega comentarios opcionales..."
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setVotingRowIndex(null);
                                setVotingScore(0);
                                setVotingComentarios("");
                              }}
                              className="flex-1 rounded-lg border border-[var(--color-neutral-grey)]/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)] transition-colors hover:bg-white/[0.05]"
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
                </button>
              </UICard>
            );
          })}
        </div>
      )}
    </UICard>
  );
}
