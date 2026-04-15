import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SettingsRequestBody = {
  votingDeadlineIso?: string | null;
};

async function ensurePostulacionesTablesExist() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PostulacionesSettings" (
      "id" INTEGER PRIMARY KEY,
      "votingDeadlineIso" TIMESTAMP(3),
      "createdByDiscordId" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "PostulacionesSettings" ("id", "votingDeadlineIso", "createdByDiscordId", "updatedAt")
    VALUES (1, NULL, NULL, NOW())
    ON CONFLICT ("id") DO NOTHING
  `);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user?.staffRole !== "Support Lead") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await ensurePostulacionesTablesExist();

  try {
    const result = await prisma.$queryRaw<Array<{ votingDeadlineIso: Date | null; createdByDiscordId: string | null }>>`
      SELECT "votingDeadlineIso", "createdByDiscordId"
      FROM "PostulacionesSettings"
      WHERE "id" = 1
    `;

    const settings = result[0] ?? { votingDeadlineIso: null, createdByDiscordId: null };

    return NextResponse.json(
      {
        votingDeadline: settings.votingDeadlineIso,
        createdByDiscordId: settings.createdByDiscordId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        error: "No se pudieron cargar los settings",
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.staffRole !== "Support Lead") {
    return NextResponse.json({ error: "No autorizado. Solo Support Lead puede cambiar la fecha límite" }, { status: 403 });
  }

  await ensurePostulacionesTablesExist();

  try {
    const body = (await request.json()) as SettingsRequestBody;
    const { votingDeadlineIso } = body;

    if (votingDeadlineIso === undefined) {
      return NextResponse.json(
        { error: "votingDeadlineIso es obligatorio" },
        { status: 400 }
      );
    }

    let deadline: Date | null = null;
    if (votingDeadlineIso) {
      deadline = new Date(votingDeadlineIso);
      if (Number.isNaN(deadline.getTime())) {
        return NextResponse.json(
          { error: "Formato de fecha inválido" },
          { status: 400 }
        );
      }
    }

    const userDiscordId = session.user?.discordUserId ?? "unknown";

    await prisma.$executeRawUnsafe(`
      UPDATE "PostulacionesSettings"
      SET
        "votingDeadlineIso" = ${deadline ? deadline.toISOString() : null},
        "createdByDiscordId" = ${userDiscordId},
        "updatedAt" = NOW()
      WHERE "id" = 1
    `);

    return NextResponse.json(
      {
        success: true,
        message: "Configuración guardada correctamente",
        votingDeadline: deadline,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        error: "No se pudo actualizar la configuración",
        details: message,
      },
      { status: 500 }
    );
  }
}
