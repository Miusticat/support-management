import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { CohortHistoryPanel } from "@/app/components/cohort-history-panel";
import { authOptions } from "@/lib/auth";

export default async function CohortHistoryPage() {
  const session = await getServerSession(authOptions);
  const currentRole = session?.user?.staffRole ?? null;
  const canAccess = currentRole === "Support Lead" || currentRole === "Support Trainer";

  if (!canAccess) {
    redirect("/");
  }

  return (
    <PageShell>
      <PageHeader
        tag="Team Control"
        title="Historial de Camadas"
      />

      <div className="grid gap-6 lg:col-span-9">
        <CohortHistoryPanel />
      </div>
    </PageShell>
  );
}
