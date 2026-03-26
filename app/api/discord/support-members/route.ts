import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";

type DiscordGuildMember = {
  roles?: string[];
  user?: {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
  nick?: string | null;
};

function normalizeRoleId(value: string | undefined, fallback: string) {
  return (value ?? fallback).trim().replace(/^"|"$/g, "") || fallback;
}

const SUPPORT_ROLE_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_ID,
  "1486041737964290211"
);

async function fetchGuildMembers(guildId: string, botToken: string) {
  const collected: DiscordGuildMember[] = [];
  let after = "0";

  for (let page = 0; page < 5; page += 1) {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Discord API error ${response.status}: ${errorText.slice(0, 200) || "Unknown error"}`
      );
    }

    const pageMembers = (await response.json()) as DiscordGuildMember[];
    if (!Array.isArray(pageMembers) || pageMembers.length === 0) {
      break;
    }

    collected.push(...pageMembers);
    const lastMemberId = pageMembers[pageMembers.length - 1]?.user?.id;
    if (!lastMemberId) {
      break;
    }

    after = lastMemberId;

    if (pageMembers.length < 1000) {
      break;
    }
  }

  return collected;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!canAccessSanctionsByRole(session?.user?.staffRole ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    return NextResponse.json(
      { error: "DISCORD_GUILD_ID is not configured" },
      { status: 500 }
    );
  }

  if (!botToken) {
    return NextResponse.json(
      { error: "DISCORD_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    const members = await fetchGuildMembers(guildId, botToken);

    const supportMembers = members
      .filter((member) => Array.isArray(member.roles) && member.roles.includes(SUPPORT_ROLE_ID))
      .map((member) => {
        const id = member.user?.id ?? "";
        const displayName =
          member.nick?.trim() ||
          member.user?.global_name?.trim() ||
          member.user?.username?.trim() ||
          id;

        return { id, displayName };
      })
      .filter((member) => member.id.length > 0)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }));

    return NextResponse.json({ members: supportMembers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}