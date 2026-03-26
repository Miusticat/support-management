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
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Team Support</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">Estructura del Equipo</h2>
          <p className="mt-2 text-sm text-[var(--color-neutral-grey)]">
            Miembros con rango desde Support Lead hasta Support, actualizados desde Discord.
          </p>
        </div>
        <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-neutral-grey)]">
          Total: {members.length}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-3">
          <p className="text-xs uppercase tracking-wide text-[#ffd79a]">Support Lead</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">{grouped.leads.length}</p>
        </div>
        <div className="rounded-xl border border-[#60a5fa]/25 bg-[#60a5fa]/10 p-3">
          <p className="text-xs uppercase tracking-wide text-[#b9d8ff]">Support Trainer</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">{grouped.trainers.length}</p>
        </div>
        <div className="rounded-xl border border-[#34d399]/25 bg-[#34d399]/10 p-3">
          <p className="text-xs uppercase tracking-wide text-[#b9f5df]">Support</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">{grouped.supports.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-[var(--color-neutral-grey)]">
          Cargando miembros del equipo...
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-[var(--color-accent-red)]/40 bg-[var(--color-accent-red)]/10 p-4 text-sm text-[var(--color-accent-red)]">
          {error}
        </div>
      ) : null}

      {!loading && !error && members.length === 0 ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-[var(--color-neutral-grey)]">
          No hay miembros con rango Support Lead, Support Trainer o Support.
        </div>
      ) : null}

      {!loading && !error && members.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
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
