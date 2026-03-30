import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DiscordPositivePointsStudio } from "@/app/components/discord-positive-points-studio";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";

export default async function PositivePointsPage() {
  const session = await getServerSession(authOptions);

  if (!canAccessSanctionsByRole(session?.user?.staffRole ?? null)) {
    redirect("/");
  }

  return (
    <PageShell>
      <PageHeader
        tag="Bot Tools"
        title="Otorgar Puntos Positivos"
        description="Registro de méritos del staff con puntos positivos para evaluaciones y promociones."
      />

      <DiscordPositivePointsStudio />
    </PageShell>
  );
}
