import { DiscordAnnouncementStudio } from "@/app/components/discord-announcement-studio";
import { Sidebar } from "@/app/components/sidebar";
import { TopNavbar } from "@/app/components/top-navbar";

export default function DiscordPage() {
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
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Bot Tools</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-neutral-white)] sm:text-3xl">
            Anuncios discord
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-neutral-grey)]">
            Centro de control para publicar anuncios del bot.
          </p>
        </section>

        <DiscordAnnouncementStudio />
      </main>
    </div>
  );
}
