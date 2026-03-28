import { DiscordAnnouncementStudio } from "@/app/components/discord-announcement-studio";
import { Sidebar } from "@/app/components/sidebar";
import { TopNavbar } from "@/app/components/top-navbar";

export default function DiscordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-[var(--color-neutral-white)]">

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
