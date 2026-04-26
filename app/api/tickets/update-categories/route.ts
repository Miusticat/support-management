import { NextRequest, NextResponse } from "next/server";
import { updateTicketCategories } from "@/lib/stats/db/queries";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Updates array is required" },
        { status: 400 }
      );
    }

    // Update ticket categories
    const updated = await updateTicketCategories(updates);

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Error updating ticket categories:", error);
    return NextResponse.json(
      { error: "Failed to update ticket categories" },
      { status: 500 }
    );
  }
}
