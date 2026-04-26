import { NextRequest, NextResponse } from "next/server";
import { getVolume } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";
  const groupBy = (searchParams.get("groupBy") ?? "day") as
    | "day"
    | "week"
    | "month";

  if (!["day", "week", "month"].includes(groupBy)) {
    return NextResponse.json(
      { error: "Invalid groupBy parameter" },
      { status: 400 }
    );
  }

  const handler = searchParams.get("handler") || undefined;

  const data = await getVolume(from, to, groupBy, handler);

  return NextResponse.json(data);
}
