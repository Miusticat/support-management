import { NextRequest, NextResponse } from "next/server";
import { getRecentTickets } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 5000);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const search = searchParams.get("search") ?? "";

  const handler = searchParams.get("handler") || undefined;

  const data = await getRecentTickets(from, to, limit, offset, search, handler);

  return NextResponse.json(data);
}
