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
        description="Vista colaborativa exclusiva para Support Lead y Support Trainer. Selecciona support, revisa contexto, evalúa con puntaje visual y registra evidencia."
      >
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { step: "01", title: "Selección rápida", desc: "Búsqueda y filtros por estado." },
            { step: "02", title: "Contexto completo", desc: "Progreso, pendientes y sanciones." },
            { step: "03", title: "Evaluación dinámica", desc: "Slider + puntaje numérico + notas." },
            { step: "04", title: "Decisión automática", desc: "Aprobación final con promedio global." },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs text-[var(--color-neutral-grey)]">
              <p className="font-medium text-[var(--color-neutral-white)]">
                <span className="mr-1.5 text-[#ffac00]/60">{item.step}.</span>
                {item.title}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </PageHeader>

      <PromotionEvaluationPanel />
    </PageShell>
  );
}
