"use client";

import { Bell, Search, Settings, UserCircle2 } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function TopNavbar() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 px-4 pt-4 sm:px-8 lg:left-72">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[color:var(--surface-glass)] px-3 py-3 shadow-[0_20px_45px_rgba(7,9,30,0.5)] backdrop-blur-2xl sm:px-4">
        <label className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition-all duration-200 focus-within:border-[var(--color-accent-blue)]/65 focus-within:shadow-[0_0_24px_rgba(56,165,255,0.2)]">
          <Search className="h-4 w-4 text-[var(--color-neutral-grey)] transition-colors group-focus-within:text-[var(--color-accent-sky)]" />
          <input
            type="text"
            placeholder="Search games, achievements, friends..."
            className="w-full bg-transparent text-sm text-[var(--color-neutral-white)] placeholder:text-[var(--color-neutral-grey)] outline-none"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgba(240,240,238,0.78)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent-sky)]/50 hover:text-[var(--color-accent-sky)]"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgba(240,240,238,0.78)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
          >
            <Settings className="h-4 w-4" />
          </button>
          {isSignedIn ? (
            <>
              <button
                type="button"
                className="hidden rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/15 px-3 py-2 text-xs font-medium text-[var(--color-neutral-white)] transition-all duration-200 hover:bg-[var(--color-primary)]/25 sm:inline-flex"
                onClick={() => signOut()}
              >
                Cerrar sesion
              </button>
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[var(--color-primary)]/40 bg-gradient-to-br from-[var(--color-primary)]/55 to-[var(--color-accent-blue)]/45 text-[var(--color-neutral-white)] transition-all duration-200 hover:shadow-[0_0_18px_rgba(140,115,248,0.55)]">
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user?.name ?? "User avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="h-5 w-5" />
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-[var(--color-primary)]/45 bg-gradient-to-r from-[var(--color-primary)]/35 to-[var(--color-accent-blue)]/20 px-3 py-2 text-xs font-medium text-[var(--color-neutral-white)] transition-all duration-200 hover:shadow-[0_0_18px_rgba(140,115,248,0.45)]"
              onClick={() => signIn("discord")}
            >
              Iniciar con Discord
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
