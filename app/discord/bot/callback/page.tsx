import Link from "next/link";

type CallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  value: string | string[] | undefined,
  fallback = "-"
): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

async function exchangeBotGrantCode(code: string) {
  const clientId = process.env.DISCORD_BOT_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID;
  const clientSecret =
    process.env.DISCORD_BOT_CLIENT_SECRET ?? process.env.DISCORD_CLIENT_SECRET;
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri =
    process.env.DISCORD_BOT_REDIRECT_URI ?? `${appBaseUrl}/discord/bot/callback`;

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      detail: "Missing DISCORD_BOT_CLIENT_ID/SECRET configuration",
    };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      detail: errorText || "Code exchange failed",
    };
  }

  return {
    ok: true,
    detail: "OAuth2 code grant completed",
  };
}

export default async function DiscordBotCallbackPage({
  searchParams,
}: CallbackPageProps) {
  const params = await searchParams;
  const error = getParam(params.error, "");
  const code = getParam(params.code, "");
  const guildId = getParam(params.guild_id);
  const permissions = getParam(params.permissions);
  const hasCode = code !== "" && code !== "-";

  let exchangeDetail = "";
  let isError = error.length > 0 || !hasCode;

  if (!isError) {
    const exchangeResult = await exchangeBotGrantCode(code);
    isError = !exchangeResult.ok;
    exchangeDetail = exchangeResult.detail;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-[var(--color-neutral-white)]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffac00]/[0.05] blur-[120px]" />
      </div>

      <section className="animate-fade-in-up relative z-10 w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#141414]/80 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-8">
        <p className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]">
          Discord Bot Invite
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--color-neutral-white)]">
          {isError ? "No se pudo completar la invitación" : "Bot invitado correctamente"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-neutral-grey)]">
          {isError
            ? `Discord devolvió: ${error || exchangeDetail || "Code grant was not completed"}`
            : "La invitación del bot se completó y el code grant fue validado. Ya puedes volver al dashboard."}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-[var(--color-neutral-white)] sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">
              Guild ID
            </p>
            <p className="mt-1 break-all">{guildId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">
              Permissions
            </p>
            <p className="mt-1 break-all">{permissions}</p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border border-[#ffac00]/30 bg-[#ffac00]/15 px-4 py-2.5 text-sm font-medium text-[#ffac00] transition-all duration-200 hover:border-[#ffac00]/50 hover:bg-[#ffac00]/25 hover:shadow-[0_0_20px_rgba(255,172,0,0.12)]"
        >
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
}
