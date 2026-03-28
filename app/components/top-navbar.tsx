"use client";

import { Bell, Search, Settings, UserCircle2 } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function TopNavbar() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 px-4 pt-4 sm:px-8 lg:left-72">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#141414] px-3 py-3 shadow-[0_20px_45px_rgba(0,0,0,0.5)] sm:px-4">
        <label className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition-all duration-200 focus-within:border-[#ffac00]/50 focus-within:shadow-[0_0_24px_rgba(255,172,0,0.15)]">
          <Search className="h-4 w-4 text-[var(--color-neutral-grey)] transition-colors group-focus-within:text-[#ffac00]" />
          <input
            type="text"
            placeholder="Search games, achievements, friends..."
            className="w-full bg-transparent text-sm text-[var(--color-neutral-white)] placeholder:text-[var(--color-neutral-grey)] outline-none"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgba(240,240,238,0.78)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffac00]/50 hover:text-[#ffac00]"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgba(240,240,238,0.78)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffac00]/50 hover:text-[#ffac00]"
          >
            <Settings className="h-4 w-4" />
          </button>
          {isSignedIn ? (
            <>
              <button
                type="button"
                className="hidden rounded-xl border border-[#ffac00]/40 bg-[#ffac00]/15 px-3 py-2 text-xs font-medium text-[#ffac00] transition-all duration-200 hover:bg-[#ffac00]/25 sm:inline-flex"
                onClick={() => signOut()}
              >
                Cerrar sesion
              </button>
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[#ffac00]/40 bg-[#ffac00]/15 text-[var(--color-neutral-white)] transition-all duration-200 hover:shadow-[0_0_18px_rgba(255,172,0,0.4)]">
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
              className="inline-flex items-center rounded-xl border border-[#ffac00]/40 bg-[#ffac00]/20 px-3 py-2 text-xs font-medium text-[#ffac00] transition-all duration-200 hover:shadow-[0_0_18px_rgba(255,172,0,0.4)]"
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
