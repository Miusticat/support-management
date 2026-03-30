import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { SanctionPolicyManagementPanel } from "@/app/components/sanction-policy-management-panel";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/discord-staff-roles";

export default async function SanctionPolicyManagementPage() {
  const session = await getServerSession(authOptions);

  if (!canAccessAdminPanel(session?.user?.staffRole ?? null)) {
    redirect("/");
  }

  return (
    <PageShell>
      <PageHeader
        tag="Management"
        title="Gestión de tipos de sanción"
        description="Administra categorías de sanciones y faltas específicas para el flujo de registrar sanción."
      />

      <SanctionPolicyManagementPanel />
    </PageShell>
  );
}
