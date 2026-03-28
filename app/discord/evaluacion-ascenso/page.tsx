import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Sidebar } from "@/app/components/sidebar";
import { TopNavbar } from "@/app/components/top-navbar";
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
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-[var(--color-neutral-white)]">

      <Sidebar />
      <TopNavbar />

      <main className="relative z-10 px-4 pb-24 pt-24 sm:px-8 lg:pl-[19.5rem] lg:pr-8">
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--color-neutral-grey)]">
            Team Control
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
            Centro de Evaluacion de Ascenso
          </h1>

          <p className="mt-2 max-w-4xl text-sm text-[var(--color-neutral-grey)]">
            Vista colaborativa exclusiva para Support Lead y Support Trainer. El nuevo flujo te guia paso a paso: seleccionas support, revisas contexto, evaluas con puntaje visual y registras evidencia en menos clics.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-neutral-grey)]">
              <p className="font-medium text-[var(--color-neutral-white)]">01. Seleccion rapida</p>
              <p className="mt-1">Busqueda y filtros por estado.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-neutral-grey)]">
              <p className="font-medium text-[var(--color-neutral-white)]">02. Contexto completo</p>
              <p className="mt-1">Progreso, pendientes y sanciones.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-neutral-grey)]">
              <p className="font-medium text-[var(--color-neutral-white)]">03. Evaluacion dinamica</p>
              <p className="mt-1">Slider + puntaje numerico + notas.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-neutral-grey)]">
              <p className="font-medium text-[var(--color-neutral-white)]">04. Decision automatica</p>
              <p className="mt-1">Aprobacion final con promedio global.</p>
            </div>
          </div>
        </section>

        <PromotionEvaluationPanel />
      </main>
    </div>
  );
}
