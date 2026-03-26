import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type DiscordGuildMember = {
  roles?: string[];
  user?: {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
  nick?: string | null;
};

type TeamRole = "Support Lead" | "Support Trainer" | "Support";

type TeamMember = {
  id: string;
  displayName: string;
  username: string;
  role: TeamRole;
  roleLevel: number;
};

function normalizeRoleId(value: string | undefined, fallback: string) {
  return (value ?? fallback).trim().replace(/^"|"$/g, "") || fallback;
}

const ROLE_SUPPORT_LEAD_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_LEAD_ID,
  "1486041732238803096"
);
const ROLE_SUPPORT_TRAINER_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_TRAINER_ID,
  "1486041733405081712"
);
const ROLE_SUPPORT_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_ID,
  "1486041737964290211"
);

function getRoleFromIds(roleIds: string[]): { role: TeamRole | null; roleLevel: number } {
  if (roleIds.includes(ROLE_SUPPORT_LEAD_ID)) {
    return { role: "Support Lead", roleLevel: 3 };
  }

  if (roleIds.includes(ROLE_SUPPORT_TRAINER_ID)) {
    return { role: "Support Trainer", roleLevel: 2 };
  }

  if (roleIds.includes(ROLE_SUPPORT_ID)) {
    return { role: "Support", roleLevel: 1 };
  }

  return { role: null, roleLevel: 0 };
}

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

  if (!session?.user?.id || (session.user.staffLevel ?? 0) < 1) {
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

    const teamMembers: TeamMember[] = members
      .map((member) => {
        const id = member.user?.id?.trim() ?? "";
        const username = member.user?.username?.trim() ?? "";
        const displayName =
          member.nick?.trim() ||
          member.user?.global_name?.trim() ||
          username ||
          id;

        const roleIds = Array.isArray(member.roles) ? member.roles : [];
        const roleInfo = getRoleFromIds(roleIds);

        if (!id || !roleInfo.role) {
          return null;
        }

        return {
          id,
          username,
          displayName,
          role: roleInfo.role,
          roleLevel: roleInfo.roleLevel,
        };
      })
      .filter((member): member is TeamMember => Boolean(member))
      .sort((a, b) => {
        if (b.roleLevel !== a.roleLevel) {
          return b.roleLevel - a.roleLevel;
        }

        return a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" });
      });

    const grouped = {
      leads: teamMembers.filter((member) => member.role === "Support Lead"),
      trainers: teamMembers.filter((member) => member.role === "Support Trainer"),
      supports: teamMembers.filter((member) => member.role === "Support"),
    };

    return NextResponse.json({
      members: teamMembers,
      grouped,
      totals: {
        leads: grouped.leads.length,
        trainers: grouped.trainers.length,
        supports: grouped.supports.length,
        all: teamMembers.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
