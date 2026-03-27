export const StaffLevel = {
  none: 0,
  support: 1,
  trainer: 2,
  lead: 3,
  head: 4,
} as const;

export type StaffRoleName =
  | "Head of Team"
  | "Support Lead"
  | "Support Trainer"
  | "Support"
  | null;

export type StaffRoleResolution = {
  roleName: StaffRoleName;
  staffLevel: number;
  roleIds: string[];
};

type DiscordGuildMemberResponse = {
  roles?: string[];
};

function normalizeRoleId(value: string | undefined, fallback: string) {
  const normalized = (value ?? fallback).trim().replace(/^"|"$/g, "");
  return normalized || fallback;
}

const ROLE_HEAD_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_HEAD_ID,
  "1486041734537416777"
);
const ROLE_LEAD_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_LEAD_ID,
  "1486041732238803096"
);
const ROLE_TRAINER_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_TRAINER_ID,
  "1486041733405081712"
);
const ROLE_SUPPORT_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_ID,
  "1486041737964290211"
);

export function resolveStaffRoleFromRoleIds(roleIds: string[]): StaffRoleResolution {
  if (roleIds.includes(ROLE_HEAD_ID)) {
    return { roleName: "Head of Team", staffLevel: StaffLevel.head, roleIds };
  }

  if (roleIds.includes(ROLE_LEAD_ID)) {
    return { roleName: "Support Lead", staffLevel: StaffLevel.lead, roleIds };
  }

  if (roleIds.includes(ROLE_TRAINER_ID)) {
    return { roleName: "Support Trainer", staffLevel: StaffLevel.trainer, roleIds };
  }

  if (roleIds.includes(ROLE_SUPPORT_ID)) {
    return { roleName: "Support", staffLevel: StaffLevel.support, roleIds };
  }

  return { roleName: null, staffLevel: StaffLevel.none, roleIds };
}

export function hasMinimumStaffLevel(currentLevel: number, requiredLevel: number) {
  return currentLevel >= requiredLevel;
}

export function canAccessSanctionsByRole(roleName: StaffRoleName) {
  return roleName === "Support Lead" || roleName === "Support Trainer";
}

export function canAccessAdminPanel(roleName: StaffRoleName) {
  return roleName === "Support Lead";
}

export async function fetchDiscordMemberRoleIds(userDiscordId: string): Promise<string[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken || !userDiscordId) {
    return [];
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userDiscordId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as DiscordGuildMemberResponse;
  return Array.isArray(data.roles) ? data.roles : [];
}

export async function fetchDiscordSelfRoleIds(accessToken: string): Promise<string[]> {
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId || !accessToken) {
    return [];
  }

  const response = await fetch(
    `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as DiscordGuildMemberResponse;
  return Array.isArray(data.roles) ? data.roles : [];
}
