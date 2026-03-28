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

type DiscordGuildMember = {
  roles?: string[];
  user?: {
    id?: string;
  };
};

function normalizeRoleId(value: string | undefined, fallback: string) {
  return (value ?? fallback).trim().replace(/^"|"$/g, "") || fallback;
}

const ROLE_SUPPORT_LEAD_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_LEAD_ID,
  "1486041732238803096"
);
const ROLE_SUPPORT_TRAINER_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_TRAINER_ID,
  "1486041733405081712"
);
const ROLE_SUPPORT_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_ID,
  "1486041737964290211"
);

async function fetchGuildSupportIds() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    return new Set<string>();
  }

  const collected: DiscordGuildMember[] = [];
  let after = "0";

  for (let page = 0; page < 5; page += 1) {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return new Set<string>();
    }

    const pageMembers = (await response.json()) as DiscordGuildMember[];
    if (!Array.isArray(pageMembers) || pageMembers.length === 0) {
      break;
    }

    collected.push(...pageMembers);
    const lastMemberId = pageMembers[pageMembers.length - 1]?.user?.id;
    if (!lastMemberId) {
      break;
    }

    after = lastMemberId;
    if (pageMembers.length < 1000) {
      break;
    }
  }

  return new Set(
    collected
      .filter((member) => {
        const roles = Array.isArray(member.roles) ? member.roles : [];
        return (
          roles.includes(ROLE_SUPPORT_LEAD_ID) ||
          roles.includes(ROLE_SUPPORT_TRAINER_ID) ||
          roles.includes(ROLE_SUPPORT_ID)
        );
      })
      .map((member) => member.user?.id?.trim() ?? "")
      .filter((id) => id.length > 0)
  );
}

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

  const currentSupportIds = await fetchGuildSupportIds();
  let gravesCount = 0;
  const breakdownMap = new Map<string, number>([
    ["Advertencia", 0],
    ["Warn Intermedio", 0],
    ["Warn Grave", 0],
    ["Suspension", 0],
    ["Remocion", 0],
  ]);

  for (const row of sanctionRows) {
    if (["Warn Grave", "Suspension", "Remocion"].includes(row.appliedSanction)) {
      gravesCount += 1;
    }

    breakdownMap.set(row.appliedSanction, (breakdownMap.get(row.appliedSanction) ?? 0) + 1);
  }

  const inactiveSupports = new Set<string>();

  for (const row of lifecycleRows) {
    if (row.supportDiscordId?.trim()) {
      if (["Expulsado", "Renuncio"].includes(row.manualStatus)) {
        inactiveSupports.add(row.supportDiscordId);
      }
    }
  }

  const activeSupportCount =
    currentSupportIds.size > 0
      ? Array.from(currentSupportIds).filter((supportId) => !inactiveSupports.has(supportId)).length
      : lifecycleRows.filter((row) => !["Expulsado", "Renuncio"].includes(row.manualStatus)).length;

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
        value: String(activeSupportCount),
        description: "Total de supports en estado Activo",
        icon: UsersRound,
        gradient: "from-[#ffac00]/20 via-[#ffac00]/10 to-[#e67e22]/15",
      },
      {
        title: "Casos Graves",
        value: String(gravesCount),
        description: "Warn Grave, Suspension y Remocion registradas.",
        icon: ShieldCheck,
        gradient: "from-[#ffac00]/18 via-[#e67e22]/12 to-[#ff9800]/15",
      },
      {
        title: "Bajas del Equipo",
        value: String(expulsadosOrRenuncias),
        description: "Supports en estado Expulsado o Renuncio.",
        icon: UserX,
        gradient: "from-[#ffac00]/15 via-[#e67e22]/18 to-[#ff9800]/12",
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
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-[var(--color-neutral-white)]">

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
