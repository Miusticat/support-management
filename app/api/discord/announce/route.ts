import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { sendDiscordComponentsV2Webhook, type ComponentsV2Input, type ComponentBlock } from "@/lib/discord-webhook";

type AnnounceRequestBody = {
  title?: string;
  description?: string;
  accentColorHex?: string;
  spoiler?: boolean;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  blocks?: ComponentBlock[];
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  buttons?: Array<{
    label: string;
    url?: string;
    style?: 1 | 2 | 3 | 4 | 5;
    emoji?: string;
  }>;
  sections?: Array<{
    text: string;
    thumbnailUrl?: string;
    buttonLabel?: string;
    buttonUrl?: string;
  }>;
  contentAbove?: string;
  webhookUsername?: string;
  webhookAvatarUrl?: string;
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

  if (!body.title && !body.description) {
    return NextResponse.json(
      { error: "title or description is required" },
      { status: 400 }
    );
  }

  try {
    const payload: ComponentsV2Input = {
      accentColorHex: body.accentColorHex,
      spoiler: body.spoiler,
      title: body.title,
      description: body.description,
      thumbnailUrl: body.thumbnailUrl,
      imageUrl: body.imageUrl,
      footerText: body.footerText,
      blocks: body.blocks,
      fields: body.fields,
      buttons: body.buttons,
      sections: body.sections,
      contentAbove: body.contentAbove,
      webhookUsername: body.webhookUsername,
      webhookAvatarUrl: body.webhookAvatarUrl,
    };

    await sendDiscordComponentsV2Webhook(webhookUrl, payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
