"use client";

import { Bell, Menu, Search, UserCircle2 } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSidebar } from "@/app/components/sidebar-context";

export function TopNavbar() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#111]/95 px-4 sm:px-6">
      <button
        type="button"
        onClick={toggle}
        className="grid h-9 w-9 place-items-center rounded-md text-[var(--color-neutral-grey)] hover:bg-white/[0.04] hover:text-[var(--color-neutral-white)] lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-4 w-4" />
      </button>

      <label className="group flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 transition-colors focus-within:border-[#ffac00]/40 focus-within:bg-white/[0.03]">
        <Search className="h-4 w-4 shrink-0 text-[var(--color-neutral-grey)] transition-colors group-focus-within:text-[#ffac00]" />
        <input
          type="text"
          placeholder="Buscar en el panel..."
          className="w-full bg-transparent text-sm text-[var(--color-neutral-white)] placeholder:text-[var(--color-neutral-grey)]/50 outline-none"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-md border border-white/[0.06] bg-white/[0.02] text-[var(--color-neutral-grey)] transition-colors hover:border-[#ffac00]/30 hover:text-[#ffac00]"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
        </button>
        {isSignedIn ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--color-neutral-grey)] transition-colors hover:border-[#ffac00]/30 hover:text-[#ffac00] sm:inline-flex"
              onClick={() => signOut()}
            >
              Cerrar sesión
            </button>
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-md border border-[#ffac00]/30 bg-[#ffac00]/10 text-[var(--color-neutral-white)]">
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
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-[#ffac00]/40 bg-[#ffac00]/15 px-3 py-1.5 text-xs font-medium text-[#ffac00] transition-colors hover:bg-[#ffac00]/25"
            onClick={() => signIn("discord")}
          >
            Iniciar con Discord
          </button>
        )}
      </div>
    </header>
  );
}
