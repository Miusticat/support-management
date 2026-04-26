import { NextRequest, NextResponse } from "next/server";
import { getHandlerLeaderboard, getActiveSupportMembers } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";

  const [data, supportMembers] = await Promise.all([
    getHandlerLeaderboard(from, to),
    getActiveSupportMembers()
  ]);

  // Add support member status to each handler
  const enrichedData = data.map(handler => ({
    ...handler,
    isSupportMember: supportMembers.includes(handler.handler),
    type: supportMembers.includes(handler.handler) ? 'support' : 'admin'
  }));

  return NextResponse.json(enrichedData);
}
