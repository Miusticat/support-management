"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserCheck } from "lucide-react";
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
  const [selectedSupportId, setSelectedSupportId] = useState<string>("");
  const [showSanctionsSummary, setShowSanctionsSummary] = useState(false);
  const [scoreDraft, setScoreDraft] = useState<Record<string, number>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filteredSupports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return supports.filter((support) => {
      if (normalizedQuery.length === 0) {
        return true;
      }

      return (
        support.displayName.toLowerCase().includes(normalizedQuery) ||
        support.username.toLowerCase().includes(normalizedQuery) ||
        support.id.includes(normalizedQuery)
      );
    });
  }, [supports, query]);

  const selectedSupport = useMemo(
    () => supports.find((support) => support.id === selectedSupportId) ?? null,
    [supports, selectedSupportId]
  );

  async function saveEvaluation(supportId: string) {
    const score = scoreDraft[supportId] ?? 7;
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Supports a evaluar</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{supports.length}</p>
        </UICard>
        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Evaluadores requeridos</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">{evaluators.length}</p>
        </UICard>
        <UICard className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Supports con decision final</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-neutral-white)]">
            {supports.filter((support) => support.decision !== "Pendiente").length}
          </p>
        </UICard>
      </div>

      <UICard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-neutral-white)]">Evaluacion de Ascenso</h2>
            <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
              Deben evaluar todos los Support Lead y Support Trainer. Regla de pase: promedio final mayor o igual a 7/10.
            </p>
          </div>

          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-neutral-grey)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar support"
              className="w-full rounded-xl border border-white/10 bg-[#0f1426] py-2 pl-9 pr-3 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[var(--color-primary)]/60 sm:w-72"
            />
          </label>
        </div>

        {message ? <p className="mt-3 text-xs text-[var(--color-neutral-grey)]">{message}</p> : null}

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs text-[var(--color-neutral-grey)]">
            Escala sugerida: 1 a 4 (No aprueba), 5 a 6 (Condicional), 7 a 10 (Aprueba). La decision final se calcula automaticamente cuando todos evaluan.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs text-[var(--color-neutral-grey)]">
            Evaluadores activos: {evaluators.map((item) => `${item.displayName} (${item.roleName})`).join(" | ") || "Sin evaluadores"}
          </p>
        </div>

        {loading ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-[var(--color-neutral-grey)]">
            Cargando evaluaciones...
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-[var(--color-accent-red)]/40 bg-[var(--color-accent-red)]/12 p-3 text-sm text-[var(--color-accent-red)]">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <div className="mt-4 overflow-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[1020px] text-left text-sm">
              <thead className="bg-[#11182f] text-[var(--color-neutral-grey)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Support</th>
                  <th className="px-3 py-2 font-medium">Progreso</th>
                  <th className="px-3 py-2 font-medium">Promedio</th>
                  <th className="px-3 py-2 font-medium">Decision</th>
                  <th className="px-3 py-2 font-medium">Pendientes</th>
                  <th className="px-3 py-2 font-medium">Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupports.map((support) => (
                  <tr key={support.id} className="border-t border-white/10 align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-[var(--color-neutral-white)]">{support.displayName}</p>
                      <p className="text-xs text-[var(--color-neutral-grey)]">
                        {support.username ? `@${support.username}` : support.id}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">
                      {support.completedEvaluations}/{support.requiredEvaluations}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-neutral-white)]">
                      {support.averageScore ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${decisionClassMap[support.decision]}`}>
                        {support.decision}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-neutral-grey)]">
                      {support.pendingEvaluators.length > 0
                        ? support.pendingEvaluators.join(", ")
                        : "Todos completaron"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSupportId(support.id);
                            setShowSanctionsSummary(false);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${{
                            true: "border-white/15 bg-white/5 text-[var(--color-neutral-white)]",
                            false: "border-white/10 bg-transparent text-[var(--color-neutral-grey)]",
                          }[String(selectedSupportId === support.id && !showSanctionsSummary) as "true" | "false"]}`}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Evaluar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSupportId(support.id);
                            setShowSanctionsSummary(true);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${{
                            true: "border-white/15 bg-white/5 text-[var(--color-neutral-white)]",
                            false: "border-white/10 bg-transparent text-[var(--color-neutral-grey)]",
                          }[String(selectedSupportId === support.id && showSanctionsSummary) as "true" | "false"]}`}
                        >
                          Ver sanciones
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredSupports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-[var(--color-neutral-grey)]">
                      No hay supports para evaluar con el filtro actual.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </UICard>

      <UICard className="p-5">
        <h3 className="text-base font-semibold text-[var(--color-neutral-white)]">Panel del Evaluador</h3>
        {!selectedSupport ? (
          <p className="mt-3 text-sm text-[var(--color-neutral-grey)]">
            Selecciona un Support desde la tabla y pulsa "Evaluar" para registrar tu calificacion.
          </p>
        ) : showSanctionsSummary ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-sm font-medium text-[var(--color-neutral-white)]">Resumen de sanciones: {selectedSupport.displayName}</p>
              <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">{selectedSupport.sanctionsSummary.text}</p>
            </div>

            {!selectedSupport.sanctionsSummary.hasSanctions ? (
              <p className="text-sm text-[var(--color-neutral-grey)]">Sin sanciones registradas.</p>
            ) : (
              <div className="overflow-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[680px] text-left text-sm">
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

            <button
              type="button"
              onClick={() => setShowSanctionsSummary(false)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)]"
            >
              Volver a evaluar
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-sm font-medium text-[var(--color-neutral-white)]">{selectedSupport.displayName}</p>
              <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                {selectedSupport.username ? `@${selectedSupport.username}` : selectedSupport.id}
              </p>
            </div>

            {selectedSupport.myEvaluation ? (
              <div className="rounded-xl border border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/10 p-3">
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
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[var(--color-neutral-grey)]">Puntaje (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={scoreDraft[selectedSupport.id] ?? 7}
                    onChange={(e) =>
                      setScoreDraft((prev) => ({
                        ...prev,
                        [selectedSupport.id]: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                      }))
                    }
                    className="w-20 rounded-lg border border-white/10 bg-[#0f1426] px-2 py-1.5 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[var(--color-primary)]/60"
                  />
                </div>
                <textarea
                  value={notesDraft[selectedSupport.id] ?? ""}
                  onChange={(e) =>
                    setNotesDraft((prev) => ({
                      ...prev,
                      [selectedSupport.id]: e.target.value,
                    }))
                  }
                  placeholder="Observacion breve de la evaluacion"
                  className="min-h-20 w-full rounded-lg border border-white/10 bg-[#0f1426] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-[var(--color-primary)]/60"
                />
                <button
                  type="button"
                  onClick={() => saveEvaluation(selectedSupport.id)}
                  disabled={savingId === selectedSupport.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] disabled:opacity-60"
                >
                  <UserCheck className="h-4 w-4" />
                  {savingId === selectedSupport.id ? "Guardando..." : "Guardar evaluacion"}
                </button>
              </>
            )}
          </div>
        )}
      </UICard>
    </div>
  );
}
