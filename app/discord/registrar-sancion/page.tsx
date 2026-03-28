import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DiscordSanctionStudio } from "@/app/components/discord-sanction-studio";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";

export default async function RegisterSanctionPage() {
  const session = await getServerSession(authOptions);

  if (!canAccessSanctionsByRole(session?.user?.staffRole ?? null)) {
    redirect("/");
  }

  return (
    <PageShell>
      <PageHeader
        tag="Bot Tools"
        title="Registrar sanción"
        description="Registro formal de sanciones de staff con formato estándar para Discord."
      />

      <DiscordSanctionStudio />
    </PageShell>
  );
}