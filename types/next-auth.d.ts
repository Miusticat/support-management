import { DefaultSession } from "next-auth";
import type { StaffRoleName } from "@/lib/discord-staff-roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordUserId: string | null;
      discordGuildId: string | null;
      discordPermissions: string | null;
      staffRole: StaffRoleName;
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
    staffRole?: StaffRoleName;
    staffLevel?: number;
    discordRoleIds?: string[];
    rolesFetchedAt?: number;
  }
}
