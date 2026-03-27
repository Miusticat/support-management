import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Sidebar } from "@/app/components/sidebar";
import { TopNavbar } from "@/app/components/top-navbar";
import { AdminPanel } from "@/app/components/admin-panel";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/discord-staff-roles";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!canAccessAdminPanel(session?.user?.staffRole ?? null)) {
    redirect("/");
  }

  const staffSanctionDelegate = (prisma as unknown as {
    staffSanction?: {
      findMany: typeof prisma.$extends extends never
        ? never
        : (args: {
            orderBy: { createdAt: "desc" };
            take: number;
            select: {
              id: true;
              fecha: true;
              supportName: true;
              supportDiscordId: true;
              adminName: true;
              requestedSanction: true;
              appliedSanction: true;
              accumulationNote: true;
              createdAt: true;
            };
          }) => Promise<
            Array<{
              id: string;
              fecha: string;
              supportName: string;
              supportDiscordId: string;
              adminName: string;
              requestedSanction: string;
              appliedSanction: string;
              accumulationNote: string | null;
              createdAt: Date;
            }>
          >;
    };
  }).staffSanction;

  const sanctions = staffSanctionDelegate
    ? await staffSanctionDelegate.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 500,
        select: {
          id: true,
          fecha: true,
          supportName: true,
          supportDiscordId: true,
          adminName: true,
          requestedSanction: true,
          appliedSanction: true,
          accumulationNote: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b1b] text-[var(--color-neutral-white)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-36 h-96 w-96 rounded-full bg-[var(--color-accent-blue)]/15 blur-3xl" />
        <div className="absolute right-0 top-12 h-[28rem] w-[28rem] rounded-full bg-[var(--color-primary)]/22 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--color-accent-green)]/10 blur-3xl" />
      </div>

      <Sidebar />
      <TopNavbar />

      <main className="relative z-10 px-4 pb-24 pt-24 sm:px-8 lg:pl-[19.5rem] lg:pr-8">
        <section className="mb-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Panel de control</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
            Panel de administración
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-neutral-grey)]">
            Gestiona sanciones: retira, actualiza o modifica registros de sanciones del equipo de soporte.
          </p>
        </section>

        <AdminPanel sanctions={sanctions} />
      </main>
    </div>
  );
}
