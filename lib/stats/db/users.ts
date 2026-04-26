// Bridges tracker `getUserById(auth.id)` calls to the current NextAuth session.
// Returns the same StatsSessionUser shape for any id so existing permission
// checks (`hasPermission(user, "...")`) work unchanged.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { derivePermissionsFromSession, type StatsSessionUser } from "../permissions";

export async function getUserById(_id?: number | string | null): Promise<StatsSessionUser | null> {
  const session = await getServerSession(authOptions);
  return derivePermissionsFromSession(session);
}

export async function listUsers(): Promise<never[]> {
  return [];
}
