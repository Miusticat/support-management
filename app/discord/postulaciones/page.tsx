import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { PostulacionesPanel } from "@/app/components/postulaciones-panel";
import { PostulacionesSettingsButton } from "@/app/components/postulaciones-settings-button";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";

export default async function PostulacionesPage() {
  const session = await getServerSession(authOptions);

  if (!canAccessSanctionsByRole(session?.user?.staffRole ?? null)) {
    redirect("/");
  }

  const isLeadOnly = session?.user?.staffRole === "Support Lead";

  return (
    <PageShell>
      <PageHeader
        tag="Recruitment"
        title="Postulaciones"
        description="Respuestas del formulario de Google con evaluación en tiempo real."
      >
        {isLeadOnly && <PostulacionesSettingsButton />}
      </PageHeader>

      <div className="grid gap-6 lg:col-span-9">
        <PostulacionesPanel />
      </div>
    </PageShell>
  );
}
