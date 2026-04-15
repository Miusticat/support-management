import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";
import { PromotionEvaluationPanel } from "@/app/components/promotion-evaluation-panel";
import { authOptions } from "@/lib/auth";

export default async function PromotionEvaluationPage() {
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
        title="Centro de Evaluación de Ascenso"
      />

      <PromotionEvaluationPanel />
    </PageShell>
  );
}
