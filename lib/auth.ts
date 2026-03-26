import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import {
  fetchDiscordMemberRoleIds,
  fetchDiscordSelfRoleIds,
  resolveStaffRoleFromRoleIds,
  StaffLevel,
} from "@/lib/discord-staff-roles";

const requiredGuildId = process.env.DISCORD_GUILD_ID;
const ROLE_REFRESH_INTERVAL_MS = 30_000;

type DiscordGuild = {
  id: string;
  permissions?: string;
};

async function getGuildMembership(accessToken: string) {
  if (!requiredGuildId) {
    return null;
  }

  const response = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const guilds = (await response.json()) as DiscordGuild[];
  return guilds.find((guild) => guild.id === requiredGuildId) ?? null;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "identify email guilds guilds.members.read",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "discord") {
        return true;
      }

      if (!requiredGuildId) {
        return false;
      }

      const accessToken = account.access_token;
      if (!accessToken) {
        return false;
      }

      const membership = await getGuildMembership(accessToken);
      return Boolean(membership);
    },
    async jwt({ token, account }) {
      if (account?.provider === "discord" && account.access_token) {
        const membership = await getGuildMembership(account.access_token);
        token.discordGuildId = membership?.id ?? null;
        token.discordPermissions = membership?.permissions ?? null;
        token.discordAccessToken = account.access_token;
      }

      let discordUserId =
        typeof account?.providerAccountId === "string"
          ? account.providerAccountId
          : typeof token.discordUserId === "string"
            ? token.discordUserId
            : null;

      if (!discordUserId && token.sub) {
        const accountRecord = await prisma.account.findFirst({
          where: {
            userId: token.sub,
            provider: "discord",
          },
          select: {
            providerAccountId: true,
          },
        });

        if (accountRecord?.providerAccountId) {
          discordUserId = accountRecord.providerAccountId;
        }
      }

      if (discordUserId) {
        token.discordUserId = discordUserId;

        const now = Date.now();
        const lastRefresh =
          typeof token.rolesFetchedAt === "number" ? token.rolesFetchedAt : 0;
        const shouldRefreshRoles =
          account?.provider === "discord" || now - lastRefresh >= ROLE_REFRESH_INTERVAL_MS;

        if (shouldRefreshRoles) {
          let roleIds: string[] = [];

          if (typeof token.discordAccessToken === "string" && token.discordAccessToken.length > 0) {
            roleIds = await fetchDiscordSelfRoleIds(token.discordAccessToken);
          }

          if (roleIds.length === 0) {
            roleIds = await fetchDiscordMemberRoleIds(discordUserId);
          }

          // Keep previous resolved role on transient fetch failures to avoid UI flicker.
          if (roleIds.length > 0) {
            const roleResolution = resolveStaffRoleFromRoleIds(roleIds);

            token.discordRoleIds = roleResolution.roleIds;
            token.staffRole = roleResolution.roleName;
            token.staffLevel = roleResolution.staffLevel;
            token.rolesFetchedAt = now;
          }
        }
      }

      if (typeof token.staffLevel !== "number") {
        token.staffLevel = StaffLevel.none;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.discordUserId =
          typeof token.discordUserId === "string" ? token.discordUserId : null;
        session.user.discordGuildId =
          typeof token.discordGuildId === "string" ? token.discordGuildId : null;
        session.user.discordPermissions =
          typeof token.discordPermissions === "string" ? token.discordPermissions : null;
        session.user.staffRole =
          typeof token.staffRole === "string" ? token.staffRole : null;
        session.user.staffLevel =
          typeof token.staffLevel === "number" ? token.staffLevel : StaffLevel.none;
        session.user.discordRoleIds = Array.isArray(token.discordRoleIds)
          ? token.discordRoleIds.filter((value): value is string => typeof value === "string")
          : [];
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "discord") {
        return;
      }

      if (!requiredGuildId || !account.access_token || !user.id) {
        return;
      }

      const membership = await getGuildMembership(account.access_token);
      if (!membership) {
        return;
      }

      await prisma.discordMembership.upsert({
        where: {
          userId: user.id,
        },
        update: {
          guildId: membership.id,
          permissions: membership.permissions ?? null,
        },
        create: {
          userId: user.id,
          guildId: membership.id,
          permissions: membership.permissions ?? null,
        },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
