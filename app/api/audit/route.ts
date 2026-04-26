import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isAuthError } from "@/lib/stats/api-auth";
import { getAuditLog } from "@/lib/stats/db/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("can_view_audit");
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 500);
  const offset = Number(searchParams.get("offset") ?? 0);
  const action = searchParams.get("action") || undefined;
  const username = searchParams.get("username") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const data = await getAuditLog({ limit, offset, action, username, from, to });
  return NextResponse.json(data);
}
