import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/stats/db/index";
import { ensureDbInitialized } from "@/lib/stats/db/schema";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    await ensureDbInitialized();
    const sql = getSql();

    // Get category statistics
    const stats = await sql`
      SELECT 
        tc.id as "categoryId",
        tc.name as "categoryName",
        tc.color,
        tc.icon,
        COALESCE(COUNT(t.id), 0)::integer as "ticketCount",
        ROUND(
          (COALESCE(COUNT(t.id), 0.0) / 
          NULLIF((SELECT COUNT(*) FROM tickets WHERE category_id IS NOT NULL), 0)) * 100, 2
        ) as "percentage"
      FROM ticket_categories tc
      LEFT JOIN tickets t ON tc.id = t.category_id
      WHERE tc.is_active = true
      GROUP BY tc.id, tc.name, tc.color, tc.icon
      ORDER BY tc.sort_order ASC, tc.name ASC
    `;

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching category stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch category statistics" },
      { status: 500 }
    );
  }
}
