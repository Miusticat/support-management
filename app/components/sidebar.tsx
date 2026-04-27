"use client";

import { ComponentType, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Megaphone,
  ClipboardCheck,
  AlertTriangle,
  ScrollText,
  UsersRound,
  LogOut,
  Shield,
  UserCircle2,
  Award,
  Settings2,
  History,
  FileText,
  BarChart3,
  Upload,
  Database,
  Tags,
  X,
} from "lucide-react";
import { useSidebar } from "@/app/components/sidebar-context";

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
    heading: "Estadísticas",
    items: [
      { label: "Dashboard", icon: BarChart3, href: "/estadisticas" },
      { label: "Importar datos", icon: Upload, href: "/estadisticas/import" },
      { label: "Categorías", icon: Tags, href: "/estadisticas/categories/stats" },
      { label: "Gestión de datos", icon: Database, href: "/estadisticas/manage" },
      { label: "Miembros de soporte", icon: UsersRound, href: "/estadisticas/manage/support-members" },
      { label: "Auditoría de tickets", icon: ScrollText, href: "/estadisticas/admin/audit" },
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
  if (href === "#") return false;
  if (href === "/") return pathname === "/";
  if (href === "/discord") return pathname === "/discord";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Item({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-white/[0.04] text-[#ffac00]"
          : "text-[var(--color-neutral-grey)] hover:bg-white/[0.03] hover:text-[var(--color-neutral-white)]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[#ffac00]" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function canSeeItem(
  item: NavItem,
  canAccessSupports: boolean,
  canAccessSanctions: boolean,
  canAccessAdmin: boolean,
  canAccessStats: boolean,
  canManageStats: boolean,
  canViewAudit: boolean
) {
  if (item.href === "/supports") return canAccessSupports;
  if (
    [
      "/discord/evaluacion-ascenso",
      "/discord/postulaciones",
      "/discord/historial-camadas",
      "/discord/registrar-sancion",
      "/discord/puntos-positivos",
      "/discord/historial-sanciones",
    ].includes(item.href)
  ) {
    return canAccessSanctions;
  }
  if (item.href === "/discord/gestion-sanciones") return canAccessAdmin;
  if (item.href === "/discord/admin") return canAccessAdmin;
  if (item.href === "/estadisticas" || item.href === "/estadisticas/categories/stats") return canAccessStats;
  if (
    item.href === "/estadisticas/import" ||
    item.href === "/estadisticas/manage" ||
    item.href === "/estadisticas/manage/support-members"
  ) {
    return canManageStats;
  }
  if (item.href === "/estadisticas/admin/audit") return canViewAudit;
  return true;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const currentRole = session?.user?.staffRole ?? null;
  const canAccessSupports = (session?.user?.staffLevel ?? 0) >= 1;
  const canAccessSanctions = currentRole === "Support Lead" || currentRole === "Support Trainer";
  const canAccessAdmin = currentRole === "Support Lead" || currentRole === "Head of Team";
  const canAccessStats = (session?.user?.staffLevel ?? 0) >= 1;
  const canManageStats = canAccessSanctions || canAccessAdmin;
  const canViewAudit = canAccessAdmin;

  const userName = session?.user?.name ?? null;
  const userImage = session?.user?.image ?? null;

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border border-white/[0.08] bg-[#1a1a1a]">
          <Image src="/img/logo.png" alt="Support Management" width={28} height={28} className="h-7 w-7 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-neutral-white)]">Support Management</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-neutral-grey)]">GTA World</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            canSeeItem(item, canAccessSupports, canAccessSanctions, canAccessAdmin, canAccessStats, canManageStats, canViewAudit)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.heading} className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-neutral-grey)]/60">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <Item
                    key={item.label}
                    item={item}
                    active={isItemActive(pathname, item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.05] px-4 py-3">
        {userName ? (
          <div className="mb-2 flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md border border-white/[0.08] bg-[#1a1a1a]">
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
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--color-neutral-grey)] transition-colors hover:bg-white/[0.03] hover:text-[var(--color-neutral-white)]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { open, setOpen } = useSidebar();

  // Close drawer on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {/* Desktop: flush column */}
      <aside className="sticky top-0 hidden h-screen w-[260px] flex-col border-r border-white/[0.06] bg-[#111] lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile: backdrop + drawer */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.06] bg-[#111] transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md text-[var(--color-neutral-grey)] hover:bg-white/[0.04] hover:text-[var(--color-neutral-white)]"
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
