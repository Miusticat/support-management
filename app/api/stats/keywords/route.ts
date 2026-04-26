import { NextRequest, NextResponse } from "next/server";
import { getKeywords } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";

  const data = await getKeywords(from, to);

  return NextResponse.json(data);
}
