import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { sendDiscordAnnouncementWebhook } from "@/lib/discord-webhook";

type AnnounceRequestBody = {
  title?: string;
  description?: string;
  colorHex?: string;
  url?: string;
  authorName?: string;
  authorIconUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  content?: string;
};

function isAuthorizedByKey(request: Request) {
  const configuredKey = process.env.DISCORD_ANNOUNCE_KEY;
  if (!configuredKey) {
    return false;
  }

  const requestKey = request.headers.get("x-announce-key") ?? "";
  return requestKey.length > 0 && requestKey === configuredKey;
}

async function isAuthorizedBySession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return false;
  }

  const hasAllowedRole = canAccessSanctionsByRole(session.user.staffRole ?? null);
  if (!hasAllowedRole) {
    return false;
  }

  const requiredGuildId = process.env.DISCORD_GUILD_ID;
  if (!requiredGuildId) {
    return true;
  }

  if (!session.user.discordGuildId) {
    return true;
  }

  return session.user.discordGuildId === requiredGuildId;
}

export async function POST(request: Request) {
  const webhookUrl = process.env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "DISCORD_ANNOUNCEMENTS_WEBHOOK_URL is not configured" },
      { status: 500 }
    );
  }

  const authorized =
    isAuthorizedByKey(request) || (await isAuthorizedBySession());

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized to publish announcements" },
      { status: 401 }
    );
  }

  let body: AnnounceRequestBody;
  try {
    body = (await request.json()) as AnnounceRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!body.title || !body.description) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 }
    );
  }

  try {
    await sendDiscordAnnouncementWebhook(webhookUrl, {
      title: body.title,
      description: body.description,
      colorHex: body.colorHex,
      url: body.url,
      authorName: body.authorName,
      authorIconUrl: body.authorIconUrl,
      thumbnailUrl: body.thumbnailUrl,
      imageUrl: body.imageUrl,
      footerText: body.footerText,
      footerIconUrl: body.footerIconUrl,
      fields: body.fields,
      content: body.content,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
