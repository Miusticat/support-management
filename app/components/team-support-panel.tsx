"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type TeamRole = "Support Lead" | "Support Trainer" | "Support";

type TeamMember = {
  id: string;
  displayName: string;
  username: string;
  role: TeamRole;
  roleLevel: number;
};

type TeamSupportResponse = {
  members?: TeamMember[];
  totals?: {
    leads?: number;
    trainers?: number;
    supports?: number;
    all?: number;
  };
  error?: string;
};

const roleTone: Record<TeamRole, string> = {
  "Support Lead": "border-[#f59e0b]/35 bg-[#f59e0b]/15 text-[#ffd79a]",
  "Support Trainer": "border-[#60a5fa]/35 bg-[#60a5fa]/15 text-[#b9d8ff]",
  Support: "border-[#34d399]/35 bg-[#34d399]/15 text-[#b9f5df]",
};

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "SM";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
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

export function TeamSupportPanel() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMembers(showLoading: boolean) {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await fetch("/api/discord/team-support", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
        });

        const data = await parseJsonSafe<TeamSupportResponse>(response);

        if (!response.ok) {
          throw new Error(data?.error || "No se pudo cargar Team Support");
        }

        if (!active) {
          return;
        }

        setMembers(Array.isArray(data?.members) ? data.members : []);
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

    void loadMembers(true);

    const intervalId = window.setInterval(() => {
      void loadMembers(false);
    }, 20000);

    const onFocus = () => {
      void loadMembers(false);
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

  const grouped = useMemo(
    () => ({
      leads: members.filter((member) => member.role === "Support Lead"),
      trainers: members.filter((member) => member.role === "Support Trainer"),
      supports: members.filter((member) => member.role === "Support"),
    }),
    [members]
  );

  return (
    <UICard className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]/60">Team Support</p>
          <h2 className="mt-1.5 text-xl font-semibold text-[var(--color-neutral-white)]">Estructura del Equipo</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-neutral-grey)]">
            Miembros con rango desde Support Lead hasta Support, actualizados desde Discord.
          </p>
        </div>
        <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-[var(--color-neutral-grey)]">
          Total: {members.length}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.07] p-3.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#ffd79a]/80">Support Lead</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-neutral-white)]">{grouped.leads.length}</p>
        </div>
        <div className="rounded-xl border border-[#60a5fa]/20 bg-[#60a5fa]/[0.07] p-3.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#b9d8ff]/80">Support Trainer</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-neutral-white)]">{grouped.trainers.length}</p>
        </div>
        <div className="rounded-xl border border-[#34d399]/20 bg-[#34d399]/[0.07] p-3.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#b9f5df]/80">Support</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-neutral-white)]">{grouped.supports.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-[var(--color-neutral-grey)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffac00]/30 border-t-[#ffac00]" />
          Cargando miembros del equipo...
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/[0.07] p-4 text-sm text-[var(--color-accent-red)]">
          {error}
        </div>
      ) : null}

      {!loading && !error && members.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <UsersRound className="mb-3 h-8 w-8 text-[var(--color-neutral-grey)]/40" />
          <p className="text-sm text-[var(--color-neutral-grey)]">No hay miembros con rango Support Lead, Support Trainer o Support.</p>
        </div>
      ) : null}

      {!loading && !error && members.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors duration-150 hover:border-white/[0.1] hover:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#5865f2]/25 text-sm font-semibold text-[#dbe3ff]">
                  {initials(member.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-neutral-white)]">{member.displayName}</p>
                  <p className="truncate text-xs text-[var(--color-neutral-grey)]">
                    {member.username ? `@${member.username}` : `ID: ${member.id}`}
                  </p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${roleTone[member.role]}`}>
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-2 text-xs text-[var(--color-neutral-grey)] sm:grid-cols-3">
        <p className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Jerarquia por rango</p>
        <p className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" /> Sincronizacion automatica</p>
        <p className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> Datos directos de Discord</p>
      </div>
    </UICard>
  );
}
