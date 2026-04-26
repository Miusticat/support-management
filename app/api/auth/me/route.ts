import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { derivePermissionsFromSession } from "@/lib/stats/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = derivePermissionsFromSession(session);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    staffRole: user.staffRole,
    staffLevel: user.staffLevel,
    permissions: user.permissions,
  });
}
