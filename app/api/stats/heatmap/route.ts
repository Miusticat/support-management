import { NextRequest, NextResponse } from "next/server";
import { getHandlerHourly } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";
  const handler = searchParams.get("handler") || undefined;
  const supportOnly = searchParams.get("supportOnly") === "true";

  console.log("Heatmap API - supportOnly:", supportOnly);

  const data = await getHandlerHourly(from, to, handler, supportOnly);

  return NextResponse.json(data);
}
