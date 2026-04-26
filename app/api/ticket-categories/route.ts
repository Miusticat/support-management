import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/stats/db/index";
import { ensureDbInitialized } from "@/lib/stats/db/schema";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";
import { hasPermission } from "@/lib/stats/permissions";
import { getUserById } from "@/lib/stats/db/users";

const CATEGORY_SELECT = `
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
`;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const includeInactive = req.nextUrl.searchParams.get("all") === "true";
  if (includeInactive && !hasPermission(user, "can_manage_categories")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    await ensureDbInitialized();
    const sql = getSql();

    const categories = includeInactive
      ? await sql`
          SELECT ${sql.unsafe(CATEGORY_SELECT)}
          FROM ticket_categories
          ORDER BY sort_order ASC, name ASC
        `
      : await sql`
          SELECT ${sql.unsafe(CATEGORY_SELECT)}
          FROM ticket_categories
          WHERE is_active = true
          ORDER BY sort_order ASC, name ASC
        `;

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching ticket categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!hasPermission(user, "can_manage_categories")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, color, icon, description, keywords = '', weight = 3, isActive = true, sortOrder = 0 } = body;

    if (!name || !color || !icon) {
      return NextResponse.json(
        { error: "Name, color, and icon are required" },
        { status: 400 }
      );
    }

    await ensureDbInitialized();
    const sql = getSql();

    const result = await sql`
      INSERT INTO ticket_categories (name, color, icon, description, keywords, weight, is_active, sort_order)
      VALUES (${name}, ${color}, ${icon}, ${description || null}, ${keywords}, ${weight}, ${isActive}, ${sortOrder})
      RETURNING ${sql.unsafe(CATEGORY_SELECT)}
    ` as any[];

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating ticket category:", error);
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create ticket category" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!hasPermission(user, "can_manage_categories")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, color, icon, description, keywords, weight, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    await ensureDbInitialized();
    const sql = getSql();

    const result = await sql`
      UPDATE ticket_categories SET
        name = COALESCE(${name ?? null}, name),
        color = COALESCE(${color ?? null}, color),
        icon = COALESCE(${icon ?? null}, icon),
        description = ${description ?? null},
        keywords = COALESCE(${keywords ?? null}, keywords),
        weight = COALESCE(${weight ?? null}, weight),
        is_active = COALESCE(${isActive ?? null}, is_active),
        sort_order = COALESCE(${sortOrder ?? null}, sort_order),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING ${sql.unsafe(CATEGORY_SELECT)}
    ` as any[];

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating ticket category:", error);
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update ticket category" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!hasPermission(user, "can_manage_categories")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    await ensureDbInitialized();
    const sql = getSql();

    // Check if tickets reference this category
    const refs = await sql`
      SELECT COUNT(*)::integer as count FROM tickets WHERE category_id = ${Number(id)}
    ` as any[];

    if (refs[0].count > 0) {
      // Soft delete — tickets still reference it
      const result = await sql`
        UPDATE ticket_categories SET is_active = false, updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING id
      ` as any[];

      if (result.length === 0) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }

      return NextResponse.json({
        message: "Category deactivated (has associated tickets)",
        id: Number(id),
        softDeleted: true,
      });
    }

    // Hard delete — no tickets reference it
    const result = await sql`
      DELETE FROM ticket_categories WHERE id = ${Number(id)} RETURNING id
    ` as any[];

    if (result.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Category deleted",
      id: Number(id),
      softDeleted: false,
    });
  } catch (error) {
    console.error("Error deleting ticket category:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket category" },
      { status: 500 }
    );
  }
}
