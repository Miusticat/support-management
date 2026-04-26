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

    const categories = await sql`
      SELECT 
        id,
        name,
        color,
        icon,
        description,
        keywords,
        weight,
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ticket_categories 
      WHERE is_active = true 
      ORDER BY sort_order ASC, name ASC
    `;

    // Create JSON data
    const exportData = {
      exportDate: new Date().toISOString(),
      categories: categories as any[],
      metadata: {
        version: "1.0",
        description: "Exported ticket categories from GTAW Support Tracker",
        totalCategories: (categories as any[]).length
      }
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ticket-categories-${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error("Error exporting categories:", error);
    return NextResponse.json(
      { error: "Failed to export categories" },
      { status: 500 }
    );
  }
}
