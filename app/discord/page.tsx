import { DiscordAnnouncementStudio } from "@/app/components/discord-announcement-studio";
import { PageHeader } from "@/app/components/page-header";
import { PageShell } from "@/app/components/page-shell";

export default function DiscordPage() {
  return (
    <PageShell>
      <PageHeader
        tag="Bot Tools"
        title="Anuncios Discord"
        description="Centro de control para publicar anuncios del bot."
      />

      <DiscordAnnouncementStudio />
    </PageShell>
  );
}
