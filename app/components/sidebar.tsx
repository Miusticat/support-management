"use client";

import { ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Megaphone, ClipboardCheck, AlertTriangle, ScrollText, UsersRound, LogOut, Shield, UserCircle2, Award, Settings2, History, FileText } from "lucide-react";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    heading: "General",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/" },
      { label: "Supports", icon: UsersRound, href: "/supports" },
    ],
  },
  {
    heading: "Discord Tools",
    items: [
      { label: "Anuncios", icon: Megaphone, href: "/discord" },
      { label: "Registrar sanciones", icon: AlertTriangle, href: "/discord/registrar-sancion" },
      { label: "Puntos positivos", icon: Award, href: "/discord/puntos-positivos" },
      { label: "Historial de sanciones", icon: ScrollText, href: "/discord/historial-sanciones" },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "Evaluación de ascensos", icon: ClipboardCheck, href: "/discord/evaluacion-ascenso" },
      { label: "Postulaciones", icon: FileText, href: "/discord/postulaciones" },
      { label: "Historial de camadas", icon: History, href: "/discord/historial-camadas" },
      { label: "Gestión de sanciones", icon: Settings2, href: "/discord/gestion-sanciones" },
      { label: "Admin", icon: Shield, href: "/discord/admin" },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "#") {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  // Keep Discord main page active only on exact match.
  if (href === "/discord") {
    return pathname === "/discord";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Item({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
        active
          ? "bg-[#ffac00]/12 text-[#ffac00] shadow-[inset_0_0_20px_rgba(255,172,0,0.06)]"
          : "text-[var(--color-neutral-grey)] hover:bg-white/[0.04] hover:text-[var(--color-neutral-white)]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#ffac00] shadow-[0_0_8px_rgba(255,172,0,0.5)]" />
      )}
      <Icon className={`h-4 w-4 shrink-0 ${active ? "drop-shadow-[0_0_6px_rgba(255,172,0,0.4)]" : ""}`} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function canSeeItem(item: NavItem, canAccessSupports: boolean, canAccessSanctions: boolean, canAccessAdmin: boolean) {
  if (item.href === "/supports") {
    return canAccessSupports;
  }
  if (["/discord/evaluacion-ascenso", "/discord/postulaciones", "/discord/historial-camadas", "/discord/registrar-sancion", "/discord/puntos-positivos", "/discord/historial-sanciones"].includes(item.href)) {
    return canAccessSanctions;
  }
  if (item.href === "/discord/gestion-sanciones") {
    return canAccessAdmin;
  }
  if (item.href === "/discord/admin") {
    return canAccessAdmin;
  }
  return true;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const currentRole = session?.user?.staffRole ?? null;
  const canAccessSupports = (session?.user?.staffLevel ?? 0) >= 1;
  const canAccessSanctions =
    currentRole === "Support Lead" || currentRole === "Support Trainer";
  const canAccessAdmin = currentRole === "Support Lead";

  const userName = session?.user?.name ?? null;
  const userImage = session?.user?.image ?? null;

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside className="animate-slide-in-left fixed left-5 top-5 z-40 hidden h-[calc(100vh-2.5rem)] w-64 flex-col rounded-2xl border border-white/[0.08] bg-[#141414]/90 shadow-[0_25px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a]">
            <Image src="/img/logo.png" alt="Support Management" width={28} height={28} className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-neutral-white)]">Support Management</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-neutral-grey)]">GTA World</p>
          </div>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              canSeeItem(item, canAccessSupports, canAccessSanctions, canAccessAdmin)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.heading} className="mb-4">
                <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-neutral-grey)]/60">
                  {group.heading}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <Item key={item.label} item={item} active={isItemActive(pathname, item.href)} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/[0.06] px-4 py-4">
          {userName ? (
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a]">
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userImage} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle2 className="h-4 w-4 text-[var(--color-neutral-grey)]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--color-neutral-white)]">{userName}</p>
                {currentRole && (
                  <p className="truncate text-[10px] text-[var(--color-neutral-grey)]">{currentRole}</p>
                )}
              </div>
            </div>
          ) : null}
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-neutral-grey)] transition-all duration-200 hover:bg-white/[0.04] hover:text-[var(--color-neutral-white)]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────────── */}
      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-1.5rem)] -translate-x-1/2 items-center justify-around gap-1 rounded-2xl border border-white/[0.1] bg-[#141414]/90 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:hidden">
        {navGroups
          .flatMap((g) => g.items)
          .filter((item) => canSeeItem(item, canAccessSupports, canAccessSanctions, canAccessAdmin))
          .map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] transition-all ${
                  active
                    ? "bg-[#ffac00]/12 text-[#ffac00]"
                    : "text-[var(--color-neutral-grey)] hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-[4rem] truncate">{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </>
  );
}
