import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordUserId: string | null;
      discordGuildId: string | null;
      discordPermissions: string | null;
      staffRole: string | null;
      staffLevel: number;
      discordRoleIds: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordGuildId?: string | null;
    discordPermissions?: string | null;
    discordUserId?: string;
    discordAccessToken?: string;
    staffRole?: string | null;
    staffLevel?: number;
    discordRoleIds?: string[];
    rolesFetchedAt?: number;
  }
}
