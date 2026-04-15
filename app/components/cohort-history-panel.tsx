"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type ArchivedCohort = {
  id: string;
  cohortName: string;
  cohortStartDate: string;
  cohortEndDate: string;
  votingDeadlineIso: string | null;
  totalMembers: number;
  passedMembers: number;
  failedMembers: number;
  memberResults: Array<{
    displayName: string;
    decision: "Pasa" | "No Pasa" | "Pendiente";
    stage: string;
    averageScore: number | null;
  }>;
  archivedAt: string;
  closedByDiscordId: string | null;
};

export function CohortHistoryPanel() {
  const [cohorts, setCohorts] = useState<ArchivedCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCohortId, setExpandedCohortId] = useState<string | null>(null);

  async function loadCohorts() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/discord/promotion-cohort-archive", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo cargar el historial de camadas");
      }

      const data = await response.json();
      setCohorts(Array.isArray(data.cohorts) ? data.cohorts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCohorts();
  }, []);

  if (loading) {
    return (
      <UICard className="col-span-full">
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[var(--color-neutral-grey)]">Cargando historial de camadas...</p>
        </div>
      </UICard>
    );
  }

  if (error) {
    return (
      <UICard className="col-span-full border-[#fb7185]/35 bg-[#fb7185]/12">
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[#ffc3cd]">{error}</p>
        </div>
      </UICard>
    );
  }

  if (cohorts.length === 0) {
    return (
      <UICard className="col-span-full">
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[var(--color-neutral-grey)]">No hay camadas archivadas aún</p>
        </div>
      </UICard>
    );
  }

  return (
    <div className="space-y-4">
      {cohorts.map((cohort) => {
        const isExpanded = expandedCohortId === cohort.id;
        const passPercentage = cohort.totalMembers > 0 ? Math.round((cohort.passedMembers / cohort.totalMembers) * 100) : 0;
        const archivedDate = new Date(cohort.archivedAt).toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        });

        return (
          <UICard key={cohort.id} className="transition-all hover:border-[#ffac00]/50">
            <button
              type="button"
              onClick={() => setExpandedCohortId(isExpanded ? null : cohort.id)}
              className="w-full text-left"
            >
              <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[var(--color-neutral-white)]">{cohort.cohortName}</h3>
                  <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
                    Archivada el {archivedDate}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#34d399]">{passPercentage}%</p>
                    <p className="text-xs text-[var(--color-neutral-grey)]">Aprobados</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--color-neutral-grey)]">
                    <div className="text-right">
                      <p className="font-medium text-[var(--color-neutral-white)]">{cohort.passedMembers}</p>
                      <p>Pasaron</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[var(--color-neutral-white)]">{cohort.failedMembers}</p>
                      <p>No pasaron</p>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-[#ffac00]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[var(--color-neutral-grey)]" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-white/[0.06] pt-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-neutral-grey)]/60">
                      Resultados finales ({cohort.totalMembers} evaluados)
                    </div>
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {cohort.memberResults.map((member, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
                            member.decision === "Pasa"
                              ? "border-[#34d399]/35 bg-[#34d399]/12 text-[#b9f5df]"
                              : member.decision === "No Pasa"
                                ? "border-[#fb7185]/35 bg-[#fb7185]/12 text-[#ffc3cd]"
                                : "border-[#facc15]/35 bg-[#facc15]/12 text-[#ffe9a6]"
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{member.displayName}</p>
                            <p className="text-xs opacity-75">
                              Promedio: {member.averageScore !== null ? member.averageScore.toFixed(2) : "-"}/10 • {member.stage}
                            </p>
                          </div>
                          <div className="text-xs font-semibold">{member.decision}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <div className="grid grid-cols-2 gap-3 text-xs text-[var(--color-neutral-grey)]">
                      <div>
                        <p className="uppercase tracking-[0.18em]">Periodo</p>
                        <p className="mt-1 text-sm font-medium text-[var(--color-neutral-white)]">
                          {cohort.cohortStartDate} - {cohort.cohortEndDate}
                        </p>
                      </div>
                      {cohort.votingDeadlineIso && (
                        <div>
                          <p className="uppercase tracking-[0.18em]">Cierre de votación</p>
                          <p className="mt-1 text-sm font-medium text-[var(--color-neutral-white)]">
                            {new Date(cohort.votingDeadlineIso).toLocaleString("es-ES", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            </button>
          </UICard>
        );
      })}
    </div>
  );
}
