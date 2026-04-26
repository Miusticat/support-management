import { NextRequest, NextResponse } from "next/server";
import { getTopUsers } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "15", 10), 50);

  const handler = searchParams.get("handler") || undefined;

  const data = await getTopUsers(from, to, limit, handler);

  return NextResponse.json(data);
}
