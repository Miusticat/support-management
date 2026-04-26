import { NextRequest, NextResponse } from "next/server";
import { getHandlerDetail } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const handler = searchParams.get("handler");
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";

  if (!handler) {
    return NextResponse.json({ error: "handler param required" }, { status: 400 });
  }

  const detail = await getHandlerDetail(handler, from, to);
  return NextResponse.json(detail);
}
