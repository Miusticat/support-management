import { NextRequest, NextResponse } from "next/server";
import { getSupportHandlerLeaderboard, getActiveSupportMembers } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";

  try {
    // Get support-only handlers
    const supportHandlers = await getSupportHandlerLeaderboard(from, to);
    const supportMembers = await getActiveSupportMembers();

    console.log("Support members in DB:", supportMembers);
    console.log("Support handlers found:", supportHandlers);

    // Add support member status to each handler
    const enrichedData = supportHandlers.map(handler => ({
      ...handler,
      isSupportMember: supportMembers.includes(handler.handler),
      type: supportMembers.includes(handler.handler) ? 'support' : 'admin'
    }));

    return NextResponse.json({
      handlers: enrichedData,
      debug: {
        supportMembers,
        supportHandlersCount: supportHandlers.length,
        supportMembersCount: supportMembers.length
      }
    });
  } catch (error) {
    console.error("Error in support handlers API:", error);
    return NextResponse.json(
      { error: "Failed to fetch support handlers", details: error },
      { status: 500 }
    );
  }
}
