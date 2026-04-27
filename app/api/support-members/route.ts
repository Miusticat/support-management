import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/stats/db/index";
import { ensureDbInitialized } from "@/lib/stats/db/schema";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";
import { hasPermission } from "@/lib/stats/permissions";
import { getUserById } from "@/lib/stats/db/users";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  await ensureDbInitialized();
  const sql = getSql();

  const members = await sql`
    SELECT id, name, is_active, created_at, updated_at
    FROM support_members
    ORDER BY name ASC
  `;

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
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
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check for duplicates
    const existing = await sql`
      SELECT id FROM support_members WHERE name = ${trimmedName}
    ` as { id: number }[];

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Support member with this name already exists" },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO support_members (name)
      VALUES (${trimmedName})
      RETURNING id, name, is_active, created_at, updated_at
    ` as { id: number; name: string; is_active: boolean; created_at: string; updated_at: string }[];

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating support member:", error);
    return NextResponse.json(
      { error: "Failed to create support member" },
      { status: 500 }
    );
  }
}
