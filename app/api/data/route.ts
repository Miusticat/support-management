import { NextRequest, NextResponse } from "next/server";
import { getDbInfo, deleteTicketsByRange, deleteAllTickets } from "@/lib/stats/db/queries";
import { getSessionFromRequest, getIpFromRequest } from "@/lib/stats/auth-shim";
import { getUserById } from "@/lib/stats/db/users";
import { hasPermission } from "@/lib/stats/permissions";
import { logAudit } from "@/lib/stats/db/audit";
import { requireAuth, isAuthError } from "@/lib/stats/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const info = await getDbInfo();
  return NextResponse.json(info);
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await getUserById(session.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const all = searchParams.get("all");
  const ip = getIpFromRequest(req);

  if (all === "true") {
    if (!hasPermission(user, "can_delete_all")) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar todos los datos" },
        { status: 403 }
      );
    }
    const deleted = await deleteAllTickets();

    await logAudit({
      user_id: session.id,
      username: session.username,
      action: "delete_all",
      details: { deleted_count: deleted },
      ip_address: ip,
    });

    return NextResponse.json({ deleted });
  }

  if (from && to) {
    if (!hasPermission(user, "can_delete_range")) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar datos" },
        { status: 403 }
      );
    }
    const deleted = await deleteTicketsByRange(from, to);

    await logAudit({
      user_id: session.id,
      username: session.username,
      action: "delete_range",
      details: { from, to, deleted_count: deleted },
      ip_address: ip,
    });

    return NextResponse.json({ deleted });
  }

  return NextResponse.json({ error: "Specify from/to or all=true" }, { status: 400 });
}
