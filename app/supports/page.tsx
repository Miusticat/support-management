import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { SupportsOverviewPanel } from "@/app/components/supports-overview-panel";
import { authOptions } from "@/lib/auth";

export default async function SupportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.staffLevel ?? 0) < 1) {
    redirect("/");
  }

  return (
    <PageShell>
      <PageHeader
        tag="Team Control"
        title="Supports"
        description="Seguimiento completo del equipo Support con estado según historial de sanciones y nivel de gravedad."
      />

      <SupportsOverviewPanel />
    </PageShell>
  );
}
