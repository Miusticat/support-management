// Permissions adapter: map NextAuth + Discord staff roles to the
// capability flags that the ported tracker API routes/components expect.
import type { Session } from "next-auth";
import { StaffLevel, type StaffRoleName } from "@/lib/discord-staff-roles";

export type Role = "admin" | "manager" | "viewer";

export interface Permissions {
  can_import: boolean;
  can_delete_range: boolean;
  can_delete_all: boolean;
  can_export: boolean;
  can_manage_users: boolean;
  can_view_audit: boolean;
  can_manage_categories: boolean;
  can_manage_support: boolean;
}

export interface StatsSessionUser {
  id: number; // synthetic; tracker used numeric ids
  username: string;
  role: Role;
  staffRole: StaffRoleName;
  staffLevel: number;
  permissions: Permissions;
}

// Map staff role to tracker role + permission flags.
// - Lead  → admin (all powers)
// - Trainer → manager (import, manage, export, view audit, manage categories/support, delete range)
// - Support → viewer (no mutations, dashboard read-only)
// - Head → admin
export function derivePermissionsFromSession(session: Session | null): StatsSessionUser | null {
  const user = session?.user;
  if (!user) return null;

  const staffRole = (user.staffRole ?? null) as StaffRoleName;
  const staffLevel = typeof user.staffLevel === "number" ? user.staffLevel : StaffLevel.none;

  if (staffLevel < StaffLevel.support) return null;

  const isLead = staffRole === "Support Lead" || staffRole === "Head of Team";
  const isTrainer = staffRole === "Support Trainer";

  const role: Role = isLead ? "admin" : isTrainer ? "manager" : "viewer";

  const permissions: Permissions = {
    can_import: isLead || isTrainer,
    can_delete_range: isLead,
    can_delete_all: isLead,
    can_export: true,
    can_manage_users: isLead,
    can_view_audit: isLead,
    can_manage_categories: isLead || isTrainer,
    can_manage_support: isLead,
  };

  // Hash Discord user id → positive 31-bit int for the legacy numeric user id
  const did = user.discordUserId ?? user.id ?? "0";
  let h = 0;
  for (let i = 0; i < did.length; i++) h = (h * 31 + did.charCodeAt(i)) | 0;
  const numericId = Math.abs(h) || 1;

  return {
    id: numericId,
    username: user.name ?? user.discordUserId ?? "unknown",
    role,
    staffRole,
    staffLevel,
    permissions,
  };
}

export type PermissionKey = keyof Permissions;

export function hasPermission(
  user: { permissions: Permissions; role?: Role } | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  return Boolean(user.permissions[permission]);
}
