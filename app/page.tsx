import { Clock3, Gamepad2, Trophy, TimerReset } from "lucide-react";
import { ChartsPanelShell } from "@/app/components/charts-panel-shell";
import { Sidebar } from "@/app/components/sidebar";
import { StatCard } from "@/app/components/stat-card";
import { TeamSupportPanel } from "@/app/components/team-support-panel";
import { TopNavbar } from "@/app/components/top-navbar";

const stats = [
  {
    title: "Total Hours",
    value: "1,945",
    description: "Hours tracked in all games this year",
    icon: Clock3,
    gradient: "from-[var(--color-accent-green)]/35 via-[var(--color-accent-blue)]/20 to-[var(--color-primary)]/25",
  },
  {
    title: "Games Played",
    value: "348",
    description: "Total unique games launched",
    icon: Gamepad2,
    gradient: "from-[var(--color-primary)]/38 via-[var(--color-accent-blue)]/20 to-[var(--color-accent-sky)]/15",
  },
  {
    title: "Total Achievements",
    value: "2,341",
    description: "Unlocked across all platforms",
    icon: Trophy,
    gradient: "from-[var(--color-accent-orange)]/28 via-[var(--color-accent-yellow)]/20 to-[var(--color-accent-red)]/18",
  },
  {
    title: "Longest Session",
    value: "71h",
    description: "Longest streak without leaving the game",
    icon: TimerReset,
    gradient: "from-[var(--color-accent-sky)]/25 via-[var(--color-primary)]/24 to-[var(--color-accent-red)]/18",
  },
];

const activityData = [
  { month: "Jan", hours: 72 },
  { month: "Feb", hours: 81 },
  { month: "Mar", hours: 89 },
  { month: "Apr", hours: 112 },
  { month: "May", hours: 129 },
  { month: "Jun", hours: 155 },
  { month: "Jul", hours: 197 },
  { month: "Aug", hours: 184 },
  { month: "Sep", hours: 203 },
  { month: "Oct", hours: 211 },
  { month: "Nov", hours: 217 },
  { month: "Dec", hours: 236 },
];

const consoleData = [
  { name: "PS5", hours: 762 },
  { name: "PC", hours: 503 },
  { name: "Switch", hours: 451 },
  { name: "Xbox", hours: 229 },
];

export default function Home() {
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
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Overview</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-neutral-grey)]">
            All key gaming metrics in one place with live trends and performance snapshots.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <section className="mt-6">
          <ChartsPanelShell activityData={activityData} consoleData={consoleData} />
        </section>

        <section className="mt-6">
          <TeamSupportPanel />
        </section>
      </main>
    </div>
  );
}
