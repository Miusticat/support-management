import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  derivePermissionsFromSession,
  type StatsSessionUser,
  type PermissionKey,
} from "./permissions";

export async function requireAuth(
  _req?: unknown
): Promise<StatsSessionUser | NextResponse> {
  const session = await getServerSession(authOptions);
  const user = derivePermissionsFromSession(session);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return user;
}

export async function requirePermission(
  permission: PermissionKey
): Promise<StatsSessionUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!result.permissions[permission]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

export function isAuthError(
  result: StatsSessionUser | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
