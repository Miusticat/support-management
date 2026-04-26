// Shim for tracker code that imported from "@/lib/auth" (session access).
// All access in the management app flows through NextAuth + api-auth.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { derivePermissionsFromSession, type StatsSessionUser } from "./permissions";

export async function getSession(): Promise<StatsSessionUser | null> {
  const session = await getServerSession(authOptions);
  return derivePermissionsFromSession(session);
}

export async function getSessionFromRequest(
  _req?: Request | { headers: Headers } | unknown
): Promise<StatsSessionUser | null> {
  return getSession();
}

export function getIpFromRequest(req: Request | { headers: Headers }): string {
  const headers = (req as { headers: Headers }).headers;
  const xff = headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
