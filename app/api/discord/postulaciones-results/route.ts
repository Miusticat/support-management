import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { prisma } from "@/lib/prisma";

type StoredResult = {
  postulacionIndex: string;
  candidateName: string;
  submittedAt: string | null;
  averageScore: number | null;
  votesCount: number;
  status: string;
  decisionReason: string | null;
  finalizedAt: Date;
};

function csvEscape(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

async function ensureResultsTableExists() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PostulacionesResult" (
      "id" TEXT PRIMARY KEY,
      "postulacionIndex" TEXT NOT NULL UNIQUE,
      "candidateName" TEXT NOT NULL,
      "submittedAt" TEXT,
      "averageScore" DOUBLE PRECISION,
      "votesCount" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL,
      "decisionReason" TEXT,
      "headersJson" TEXT,
      "rowDataJson" TEXT,
      "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !canAccessSanctionsByRole(session.user?.staffRole ?? null)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureResultsTableExists();

    const results = await prisma.$queryRaw<StoredResult[]>`
      SELECT
        "postulacionIndex",
        "candidateName",
        "submittedAt",
        "averageScore",
        "votesCount",
        "status",
        "decisionReason",
        "finalizedAt"
      FROM "PostulacionesResult"
      ORDER BY
        CASE WHEN "averageScore" IS NULL THEN 999 ELSE 0 END,
        "averageScore" DESC,
        "candidateName" ASC
    `;

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Todavía no hay resultados consolidados para descargar" },
        { status: 409 }
      );
    }

    const csvHeader = [
      "Postulacion",
      "Nombre",
      "FechaEnvio",
      "Promedio",
      "CantidadVotos",
      "Resultado",
      "Detalle",
      "FinalizadoEn",
    ];

    const csvRows = results.map((row) => {
      const average = row.averageScore === null ? "Sin votos" : row.averageScore.toFixed(2);

      return [
        row.postulacionIndex,
        row.candidateName,
        row.submittedAt ?? "",
        average,
        String(row.votesCount),
        row.status,
        row.decisionReason ?? "",
        row.finalizedAt.toISOString(),
      ]
        .map((cell) => csvEscape(cell))
        .join(",");
    });

    const csvContent = [csvHeader.map((cell) => csvEscape(cell)).join(","), ...csvRows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="postulaciones-resultados-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      { error: "No se pudieron descargar los resultados", details: message },
      { status: 500 }
    );
  }
}
