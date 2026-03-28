import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Sidebar } from "@/app/components/sidebar";
import { SupportsOverviewPanel } from "@/app/components/supports-overview-panel";
import { TopNavbar } from "@/app/components/top-navbar";
import { authOptions } from "@/lib/auth";

export default async function SupportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.staffLevel ?? 0) < 1) {
    redirect("/");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-[var(--color-neutral-white)]">

      <Sidebar />
      <TopNavbar />

      <main className="relative z-10 px-4 pb-24 pt-24 sm:px-8 lg:pl-[19.5rem] lg:pr-8">
        <section className="mb-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Team Control</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
            Supports
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-neutral-grey)]">
            Seguimiento completo del equipo Support con estado segun historial de sanciones y nivel de gravedad.
          </p>
        </section>

        <SupportsOverviewPanel />
      </main>
    </div>
  );
}
