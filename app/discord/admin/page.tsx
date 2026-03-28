import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { AdminPanel } from "@/app/components/admin-panel";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/discord-staff-roles";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!canAccessAdminPanel(session?.user?.staffRole ?? null)) {
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
        take: 500,
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
        tag="Panel de control"
        title="Panel de administración"
        description="Gestiona sanciones: retira, actualiza o modifica registros de sanciones del equipo de soporte."
      />

      <AdminPanel sanctions={sanctions} />
    </PageShell>
  );
}
