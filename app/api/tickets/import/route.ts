import { NextRequest, NextResponse } from "next/server";
import { parseTickets } from "@/lib/stats/parser";
import { insertTickets } from "@/lib/stats/db/queries";
import { getSessionFromRequest, getIpFromRequest } from "@/lib/stats/auth-shim";
import { getUserById } from "@/lib/stats/db/users";
import { hasPermission } from "@/lib/stats/permissions";
import { logAudit } from "@/lib/stats/db/audit";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await getUserById(session.id);
  if (!user || !hasPermission(user, "can_import")) {
    return NextResponse.json(
      { error: "No tienes permiso para importar datos" },
      { status: 403 }
    );
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const raw: string = body.raw;

  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json(
      { error: "No data provided" },
      { status: 400 }
    );
  }

  const tickets = parseTickets(raw);

  if (tickets.length === 0) {
    return NextResponse.json(
      { error: "No valid tickets found in the provided data" },
      { status: 400 }
    );
  }

  const result = await insertTickets(tickets, session.id);

  await logAudit({
    user_id: session.id,
    username: session.username,
    action: "import_data",
    details: {
      total: result.total,
      inserted: result.inserted,
      duplicates: result.duplicates,
    },
    ip_address: getIpFromRequest(req),
  });

  return NextResponse.json(result);
}
