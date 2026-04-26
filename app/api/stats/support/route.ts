import { NextRequest, NextResponse } from "next/server";
import { 
  getOverviewStats,
  getHourlyDistribution,
  getVolume,
  getDayOfWeekDistribution,
  getTopUsers,
  getHandlerHourly,
  getAdvancedStats,
  getActiveSupportMembers
} from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "2000-01-01";
  const to = searchParams.get("to") ?? "2100-01-01";
  const groupBy = (searchParams.get("groupBy") ?? "day") as "day" | "week" | "month";
  const handler = searchParams.get("handler") || undefined;

  try {
    // Get support members first
    const supportMembers = await getActiveSupportMembers();
    
    // If no support members, return empty stats
    if (supportMembers.length === 0) {
      return NextResponse.json({
        overview: {
          totalTickets: 0,
          respondedTickets: 0,
          unrespondedTickets: 0,
          responseRate: 0,
          uniqueHandlers: 0,
        },
        hourly: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
        volume: [],
        weekday: Array.from({ length: 7 }, (_, i) => ({
          day: i,
          dayName: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][i],
          count: 0,
        })),
        topUsers: [],
        heatmap: [],
        advanced: {
          avgTicketsPerDay: 0,
          peakHour: 0,
          peakHourCount: 0,
          busiestDay: "-",
          busiestDayCount: 0,
          uniqueUsers: 0,
          avgPerHandler: 0,
        },
        debug: {
          supportMembers,
          message: "No support members configured"
        }
      });
    }

    // For now, we'll modify the queries to filter by support members
    // This is a temporary solution - we'll need to modify the existing functions
    // to accept support members as a parameter
    
    // Get all stats with support-only filtering
    const [
      overview,
      hourly,
      volume,
      weekday,
      topUsers,
      heatmap,
      advanced
    ] = await Promise.all([
      getOverviewStats(from, to, handler, true),
      getHourlyDistribution(from, to, handler, true),
      getVolume(from, to, groupBy, handler), // TODO: Add supportOnly parameter
      getDayOfWeekDistribution(from, to, handler, true),
      getTopUsers(from, to, 15, handler, true),
      getHandlerHourly(from, to, handler, true),
      getAdvancedStats(from, to, handler, true)
    ]);

    // TODO: Filter results to only include support members
    // For now, we'll return the full results but the frontend will handle filtering
    
    return NextResponse.json({
      overview,
      hourly,
      volume,
      weekday,
      topUsers,
      heatmap,
      advanced,
      debug: {
        supportMembers,
        message: "Full stats returned - frontend filtering needed"
      }
    });
  } catch (error) {
    console.error("Error in support stats API:", error);
    return NextResponse.json(
      { error: "Failed to fetch support statistics", details: error },
      { status: 500 }
    );
  }
}
