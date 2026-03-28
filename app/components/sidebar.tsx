"use client";

import { ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Megaphone, ClipboardCheck, AlertTriangle, ScrollText, UsersRound, Settings, LogOut, Shield } from "lucide-react";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
};

const primaryItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Supports", icon: UsersRound, href: "/supports" },
  { label: "Anuncios discord", icon: Megaphone, href: "/discord" },
  { label: "Evaluación de ascensos", icon: ClipboardCheck, href: "/discord/evaluacion-ascenso" },
  { label: "Registrar sanciones", icon: AlertTriangle, href: "/discord/registrar-sancion" },
  { label: "Historial de sanciones", icon: ScrollText, href: "/discord/historial-sanciones" },
  { label: "Admin", icon: Shield, href: "/discord/admin" },
];

const secondaryItems: NavItem[] = [
  { label: "Configuración", icon: Settings, href: "#" },
  { label: "Cerrar sesión", icon: LogOut, href: "#" },
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
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
        active
          ? "bg-[#ffac00]/15 text-[#ffac00] border-l-2 border-[#ffac00]"
          : "text-[var(--color-neutral-grey)] hover:bg-white/5 hover:text-[var(--color-neutral-white)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const currentRole = session?.user?.staffRole ?? null;
  const canAccessSupports = (session?.user?.staffLevel ?? 0) >= 1;
  const canAccessSanctions =
    currentRole === "Support Lead" || currentRole === "Support Trainer";
  const canAccessAdmin = currentRole === "Support Lead";

  const visiblePrimaryItems = primaryItems.filter((item) => {
    if (item.href === "/supports") {
      return canAccessSupports;
    }

    if (
      [
        "/discord/evaluacion-ascenso",
        "/discord/registrar-sancion",
        "/discord/historial-sanciones",
      ].includes(item.href)
    ) {
      return canAccessSanctions;
    }

    if (item.href === "/discord/admin") {
      return canAccessAdmin;
    }

    return true;
  });

  return (
    <>
      <aside className="fixed left-5 top-5 z-40 hidden h-[calc(100vh-2.5rem)] w-64 flex-col rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.65)] lg:flex">
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-[#ffac00]/20 bg-[#ffac00]/5 px-3 py-3">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-white/15 bg-[#1a1a1a]">
            <Image src="/img/logo.png" alt="Support Management System" width={36} height={36} className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Support Management</p>
            <p className="text-base font-medium leading-tight text-[var(--color-neutral-white)]">Support Management System</p>
          </div>
        </div>

        <div className="space-y-2">
          {visiblePrimaryItems.map((item) => (
            <Item key={item.label} item={item} active={isItemActive(pathname, item.href)} />
          ))}
        </div>

        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          {secondaryItems.map((item) => (
            <Item key={item.label} item={item} active={false} />
          ))}
        </div>
      </aside>

      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-1.5rem)] -translate-x-1/2 items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#141414] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] lg:hidden">
        {visiblePrimaryItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition-all ${
                active
                  ? "bg-[#ffac00]/15 text-[#ffac00]"
                  : "text-[var(--color-neutral-grey)] hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
