import { AlertTriangle, ShieldCheck, UsersRound, UserX } from "lucide-react";
import { ChartsPanelShell } from "@/app/components/charts-panel-shell";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/app/components/sidebar";
import { StatCard } from "@/app/components/stat-card";
import { TeamSupportPanel } from "@/app/components/team-support-panel";
import { TopNavbar } from "@/app/components/top-navbar";

export const dynamic = "force-dynamic";

const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type SanctionRow = {
  supportDiscordId: string;
  appliedSanction: string;
  createdAt: Date;
};

type LifecycleRow = {
  supportDiscordId: string;
  manualStatus: string;
};

async function loadDashboardData() {
  const sanctionRows = await prisma.$queryRaw<SanctionRow[]>`
    SELECT "supportDiscordId", "appliedSanction", "createdAt"
    FROM "StaffSanction"
  `;

  let lifecycleRows: LifecycleRow[] = [];
  try {
    lifecycleRows = await prisma.$queryRaw<LifecycleRow[]>`
      SELECT "supportDiscordId", "manualStatus"
      FROM "SupportLifecycleState"
    `;
  } catch {
    lifecycleRows = [];
  }

  const uniqueSupports = new Set<string>();
  let gravesCount = 0;
  const breakdownMap = new Map<string, number>([
    ["Advertencia", 0],
    ["Warn Intermedio", 0],
    ["Warn Grave", 0],
    ["Suspension", 0],
    ["Remocion", 0],
  ]);

  for (const row of sanctionRows) {
    if (row.supportDiscordId?.trim()) {
      uniqueSupports.add(row.supportDiscordId);
    }

    if (["Warn Grave", "Suspension", "Remocion"].includes(row.appliedSanction)) {
      gravesCount += 1;
    }

    breakdownMap.set(row.appliedSanction, (breakdownMap.get(row.appliedSanction) ?? 0) + 1);
  }

  for (const row of lifecycleRows) {
    if (row.supportDiscordId?.trim()) {
      uniqueSupports.add(row.supportDiscordId);
    }
  }

  const expulsadosOrRenuncias = lifecycleRows.filter((row) =>
    ["Expulsado", "Renuncio"].includes(row.manualStatus)
  ).length;

  const now = new Date();
  const monthlyCounts = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: monthLabels[date.getMonth()],
      value: 0,
    };
  });

  for (const row of sanctionRows) {
    const rowDate = new Date(row.createdAt);
    const monthIndex = monthlyCounts.findIndex(
      (item) => item.year === rowDate.getFullYear() && item.month === rowDate.getMonth()
    );

    if (monthIndex >= 0) {
      monthlyCounts[monthIndex].value += 1;
    }
  }

  const currentMonthCount = monthlyCounts[11]?.value ?? 0;
  const previousMonthCount = monthlyCounts[10]?.value ?? 0;
  const trendPercent =
    previousMonthCount === 0
      ? currentMonthCount > 0
        ? 100
        : 0
      : Math.round(((currentMonthCount - previousMonthCount) / previousMonthCount) * 100);

  const trendBadge = `${trendPercent >= 0 ? "+" : ""}${trendPercent}%`;

  return {
    stats: [
      {
        title: "Total de Supports",
        value: String(uniqueSupports.size),
        description: "Supports detectados por historial y estado administrativo.",
        icon: UsersRound,
        gradient: "from-[var(--color-accent-green)]/35 via-[var(--color-accent-blue)]/20 to-[var(--color-primary)]/25",
      },
      {
        title: "Sanciones Registradas",
        value: String(sanctionRows.length),
        description: "Total acumulado de sanciones en base de datos.",
        icon: AlertTriangle,
        gradient: "from-[var(--color-primary)]/38 via-[var(--color-accent-blue)]/20 to-[var(--color-accent-sky)]/15",
      },
      {
        title: "Casos Graves",
        value: String(gravesCount),
        description: "Warn Grave, Suspension y Remocion registradas.",
        icon: ShieldCheck,
        gradient: "from-[var(--color-accent-orange)]/28 via-[var(--color-accent-yellow)]/20 to-[var(--color-accent-red)]/18",
      },
      {
        title: "Bajas del Equipo",
        value: String(expulsadosOrRenuncias),
        description: "Supports en estado Expulsado o Renuncio.",
        icon: UserX,
        gradient: "from-[var(--color-accent-sky)]/25 via-[var(--color-primary)]/24 to-[var(--color-accent-red)]/18",
      },
    ],
    activityData: monthlyCounts.map((item) => ({ month: item.label, value: item.value })),
    breakdownData: Array.from(breakdownMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0),
    trendBadge,
  };
}

export default async function Home() {
  const { stats, activityData, breakdownData, trendBadge } = await loadDashboardData();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b1b] text-[var(--color-neutral-white)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-36 h-96 w-96 rounded-full bg-[var(--color-accent-blue)]/15 blur-3xl" />
        <div className="absolute right-0 top-12 h-[28rem] w-[28rem] rounded-full bg-[var(--color-primary)]/22 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--color-accent-green)]/10 blur-3xl" />
      </div>

      <Sidebar />
      <TopNavbar />

      <main className="relative z-10 px-4 pb-24 pt-24 sm:px-8 lg:pl-[19.5rem] lg:pr-8">
        <section className="mb-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Resumen</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-neutral-grey)]">
            Metricas clave del sistema en un solo lugar con tendencias y estado operativo en tiempo real.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <section className="mt-6">
          <ChartsPanelShell
            activityData={activityData}
            breakdownData={breakdownData}
            activityTitle="Actividad de Sanciones"
            activitySubtitle="Registros por mes durante los ultimos 12 meses"
            activityBadge={trendBadge}
            breakdownTitle="Distribucion por tipo"
            breakdownSubtitle="Total de sanciones por categoria aplicada"
          />
        </section>

        <section className="mt-6">
          <TeamSupportPanel />
        </section>
      </main>
    </div>
  );
}
