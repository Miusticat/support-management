import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
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
    <PageShell>
      <PageHeader
        tag="Bot Tools"
        title="Historial de sanciones"
        description="Consulta rápida de sanciones registradas, reincidencias y ranking de miembros con mayor número de sanciones."
      />

      <SanctionsHistoryPanel sanctions={sanctions} />
    </PageShell>
  );
}
