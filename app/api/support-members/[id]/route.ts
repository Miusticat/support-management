import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { ensureDbInitialized } from "@/lib/db/schema";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { hasPermission } from "@/lib/permissions";
import { getUserById } from "@/lib/db/users";

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!hasPermission(user, "can_manage_support")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  await ensureDbInitialized();
  const sql = getSql();

  try {
    const body = await req.json();
    const { id, name, is_active } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json(
        { error: "Valid ID is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be a boolean" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if member exists
    const existing = await sql`
      SELECT id FROM support_members WHERE id = ${id}
    ` as { id: number }[];

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Support member not found" },
        { status: 404 }
      );
    }

    // Check for name conflicts (excluding current record)
    const nameConflict = await sql`
      SELECT id FROM support_members WHERE name = ${trimmedName} AND id != ${id}
    ` as { id: number }[];

    if (nameConflict.length > 0) {
      return NextResponse.json(
        { error: "Support member with this name already exists" },
        { status: 409 }
      );
    }

    const result = await sql`
      UPDATE support_members
      SET name = ${trimmedName}, is_active = ${is_active}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, is_active, created_at, updated_at
    ` as { id: number; name: string; is_active: boolean; created_at: string; updated_at: string }[];

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating support member:", error);
    return NextResponse.json(
      { error: "Failed to update support member" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!hasPermission(user, "can_manage_support")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  await ensureDbInitialized();
  const sql = getSql();

  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Valid ID is required" },
        { status: 400 }
      );
    }

    // Check if member exists
    const existing = await sql`
      SELECT id FROM support_members WHERE id = ${Number(id)}
    ` as { id: number }[];

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Support member not found" },
        { status: 404 }
      );
    }

    await sql`
      DELETE FROM support_members WHERE id = ${Number(id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting support member:", error);
    return NextResponse.json(
      { error: "Failed to delete support member" },
      { status: 500 }
    );
  }
}
