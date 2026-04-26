import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/stats/db/index";
import { ensureDbInitialized } from "@/lib/stats/db/schema";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";
import { hasPermission } from "@/lib/stats/permissions";
import { getUserById } from "@/lib/stats/db/users";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!hasPermission(user, "can_manage_categories")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    await ensureDbInitialized();
    const sql = getSql();

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read and parse the JSON file
    const text = await file.text();
    const importData = JSON.parse(text);

    // Validate the import data structure
    if (!Array.isArray(importData.categories)) {
      return NextResponse.json(
        { error: "Invalid file format. Expected 'categories' array." },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;

    // Import categories
    for (const category of importData.categories) {
      const { name, color, icon, description, keywords = '', weight = 3, isActive = true, sortOrder = 0 } = category;
      
      if (!name || !color || !icon) {
        console.warn(`Skipping invalid category: ${JSON.stringify(category)}`);
        skipped++;
        continue;
      }

      try {
        await sql`
          INSERT INTO ticket_categories (name, color, icon, description, keywords, weight, is_active, sort_order)
          VALUES (${name}, ${color}, ${icon}, ${description || null}, ${keywords}, ${weight}, ${isActive}, ${sortOrder})
          ON CONFLICT (name) DO UPDATE SET
            color = EXCLUDED.color,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            keywords = EXCLUDED.keywords,
            weight = EXCLUDED.weight,
            sort_order = EXCLUDED.sort_order,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        `;
        imported++;
      } catch (error) {
        console.error(`Failed to import category ${name}:`, error);
        skipped++;
      }
    }

    return NextResponse.json({
      message: "Categories imported successfully",
      imported,
      skipped,
    });
  } catch (error) {
    console.error("Import failed:", error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON format in file" },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to import categories" },
        { status: 500 }
      );
    }
  }
}
