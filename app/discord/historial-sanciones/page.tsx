import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Sidebar } from "@/app/components/sidebar";
import { TopNavbar } from "@/app/components/top-navbar";
import { SanctionsHistoryPanel } from "@/app/components/sanctions-history-panel";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { prisma } from "@/lib/prisma";

export default async function SanctionsHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!canAccessSanctionsByRole(session?.user?.staffRole ?? null)) {
    redirect("/");
  }

  const staffSanctionDelegate = (prisma as unknown as {
    staffSanction?: {
      findMany: typeof prisma.$extends extends never
        ? never
        : (args: {
            orderBy: { createdAt: "desc" };
            take: number;
            select: {
              id: true;
              fecha: true;
              supportName: true;
              supportDiscordId: true;
              adminName: true;
              requestedSanction: true;
              appliedSanction: true;
              accumulationNote: true;
              createdAt: true;
            };
          }) => Promise<
            Array<{
              id: string;
              fecha: string;
              supportName: string;
              supportDiscordId: string;
              adminName: string;
              requestedSanction: string;
              appliedSanction: string;
              accumulationNote: string | null;
              createdAt: Date;
            }>
          >;
    };
  }).staffSanction;

  const sanctions = staffSanctionDelegate
    ? await staffSanctionDelegate.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 300,
        select: {
          id: true,
          fecha: true,
          supportName: true,
          supportDiscordId: true,
          adminName: true,
          requestedSanction: true,
          appliedSanction: true,
          accumulationNote: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-[var(--color-neutral-white)]">

      <Sidebar />
      <TopNavbar />

      <main className="relative z-10 px-4 pb-24 pt-24 sm:px-8 lg:pl-[19.5rem] lg:pr-8">
        <section className="mb-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Bot Tools</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
            Historial de sanciones
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-neutral-grey)]">
            Consulta rápida de sanciones registradas, reincidencias y ranking de miembros con mayor número de sanciones.
          </p>
        </section>

        <SanctionsHistoryPanel sanctions={sanctions} />
      </main>
    </div>
  );
}
