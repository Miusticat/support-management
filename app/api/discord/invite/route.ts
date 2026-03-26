import { NextResponse } from "next/server";

export function GET() {
  const clientId = process.env.DISCORD_BOT_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "DISCORD_BOT_CLIENT_ID or DISCORD_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const permissions = process.env.DISCORD_BOT_PERMISSIONS ?? "8";
  const guildId = process.env.DISCORD_BOT_GUILD_ID ?? process.env.DISCORD_GUILD_ID;
  const lockGuild = process.env.DISCORD_BOT_LOCK_GUILD === "true";
  const useCodeGrant = process.env.DISCORD_BOT_CODE_GRANT === "true";
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri =
    process.env.DISCORD_BOT_REDIRECT_URI ?? `${appBaseUrl}/discord/bot/callback`;

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "bot applications.commands");
  url.searchParams.set("permissions", permissions);
  url.searchParams.set("integration_type", "0");

  // Keep bot invite fully independent from user auth by default.
  if (useCodeGrant) {
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
  }

  if (guildId) {
    url.searchParams.set("guild_id", guildId);

    if (lockGuild) {
      url.searchParams.set("disable_guild_select", "true");
    }
  }

  return NextResponse.redirect(url.toString());
}
