import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { prisma } from "@/lib/prisma";

const DEFAULT_SHEET_ID = "1VSKN3G7PtWbagnmI9RoOIKFXmZFAGGe6B8Dh-0E5Z9A";
const DEFAULT_SHEET_GID = "6015011";
const PASSING_SCORE = 3;
const ROLE_TRAINER_ID = "1486041733405081712";
const ROLE_LEAD_ID = "1486041732238803096";

type DiscordMember = {
  user: { id: string; username: string };
  roles: string[];
};

type GoogleVizColumn = { label?: string };
type GoogleVizCell = { v?: unknown; f?: string };
type GoogleVizRow = { c?: Array<GoogleVizCell | null> };
type GoogleVizResponse = { table?: { cols?: GoogleVizColumn[]; rows?: GoogleVizRow[] } };

type PostulacionesEvaluationRow = {
  postulacionIndex: string;
  evaluatorDiscordId: string;
  evaluatorName: string;
  score: number;
  comentarios: string | null;
  createdAt: Date;
};

type EvaluateRequestBody = {
  postulacionIndex?: string;
  score?: number;
  comentarios?: string;
};

type FinalResultRow = {
  postulacionIndex: string;
  candidateName: string;
  submittedAt: string;
  averageScore: number | null;
  votesCount: number;
  status: string;
  finalizedAt: Date;
};

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function decideResult(averageScore: number | null, votesCount: number) {
  if (averageScore === null || votesCount === 0) {
    return {
      status: "No aprobado",
      decisionReason: "Sin votos registrados",
    };
  }

  if (averageScore >= PASSING_SCORE) {
    return {
      status: "Aprobado",
      decisionReason: `Promedio final ${averageScore.toFixed(2)} con ${votesCount} voto(s)`,
    };
  }

  return {
    status: "No aprobado",
    decisionReason: `Promedio final ${averageScore.toFixed(2)} con ${votesCount} voto(s)`,
  };
}

async function fetchEvaluatorsFromDiscord() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    return [];
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
      {
        method: "GET",
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return [];
    }

    const members = (await response.json()) as DiscordMember[];
    const evaluators = members
      .filter((member) => member.roles.includes(ROLE_TRAINER_ID) || member.roles.includes(ROLE_LEAD_ID))
      .map((member) => ({
        discordId: member.user.id,
        name: member.user.username,
        roles: [
          member.roles.includes(ROLE_TRAINER_ID) ? "Support Trainer" : null,
          member.roles.includes(ROLE_LEAD_ID) ? "Support Lead" : null,
        ].filter(Boolean) as string[],
      }));

    return evaluators;
  } catch {
    return [];
  }
}

function parseGoogleVizPayload(raw: string): GoogleVizResponse {
  const firstParen = raw.indexOf("(");
  const lastParen = raw.lastIndexOf(")");

  if (firstParen === -1 || lastParen === -1 || lastParen <= firstParen) {
    throw new Error("Formato de respuesta no reconocido de Google Sheets");
  }

  const jsonPayload = raw.slice(firstParen + 1, lastParen);
  return JSON.parse(jsonPayload) as GoogleVizResponse;
}

function normalizeCellValue(cell: GoogleVizCell | null | undefined) {
  if (!cell) return "";
  if (typeof cell.f === "string" && cell.f.trim().length > 0) return cell.f;
  if (typeof cell.v === "string") return cell.v;
  if (typeof cell.v === "number" || typeof cell.v === "boolean") return String(cell.v);
  if (cell.v === null || cell.v === undefined) return "";
  return String(cell.v);
}

function isRowMeaningful(row: string[]) {
  return row.some((value) => value.trim().length > 0);
}

function normalizeHeaderLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCandidateNameColumnIndex(headers: string[]) {
  const normalizedHeaders = headers.map((header) => normalizeHeaderLabel(header));

  const preferredIndex = normalizedHeaders.findIndex(
    (header) =>
      header.includes("cual es tu nombre en el pcu") ||
      header.includes("nombre en el pcu")
  );

  if (preferredIndex >= 0) {
    return preferredIndex;
  }

  // Fallback for older sheets where name was expected in the second column.
  return headers.length > 1 ? 1 : 0;
}

function resolveCandidateName(rowData: string[], rowIndex: number, candidateNameColumnIndex: number) {
  const nameFromConfiguredColumn = rowData[candidateNameColumnIndex]?.trim() ?? "";

  if (nameFromConfiguredColumn.length > 0) {
    return nameFromConfiguredColumn;
  }

  const fallbackName = rowData[1]?.trim() || rowData[0]?.trim();
  return fallbackName && fallbackName.length > 0 ? fallbackName : `Postulación ${rowIndex + 1}`;
}

function extractSheetSourceFromUrl(value: string) {
  const input = value.trim();
  if (!input) return null;

  try {
    const parsedUrl = new URL(input);
    const sheetPathMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([^/]+)/i);
    if (sheetPathMatch?.[1]) {
      const sheetId = sheetPathMatch[1].trim();
      const gidFromQuery = parsedUrl.searchParams.get("gid")?.trim() ?? "";
      const gidFromHashMatch = parsedUrl.hash.match(/gid=(\d+)/i);
      const gidFromHash = gidFromHashMatch?.[1]?.trim() ?? "";

      return { sheetId, gid: gidFromQuery || gidFromHash || "" };
    }

    const formPathMatch = parsedUrl.pathname.match(/\/forms\/d\/([^/]+)/i);
    const formId = formPathMatch?.[1]?.trim() ?? "";

    // Google Forms does not expose raw response rows publicly by form URL.
    // For known forms, we map to their linked public responses sheet.
    if (formId === "13UPIr5vyOlc0cupR515oo7weZfekzgX5JDsMr4alB28") {
      return {
        sheetId: "1VSKN3G7PtWbagnmI9RoOIKFXmZFAGGe6B8Dh-0E5Z9A",
        gid: "6015011",
      };
    }

    return null;
  } catch {
    return null;
  }
}

function resolveSheetSource() {
  const configuredUrl = process.env.GOOGLE_POSTULACIONES_SHEET_URL?.trim() ?? "";
  const fromUrl = extractSheetSourceFromUrl(configuredUrl);

  const fromEnvId = (process.env.GOOGLE_POSTULACIONES_SHEET_ID ?? "").trim();
  const fromEnvGid = (process.env.GOOGLE_POSTULACIONES_SHEET_GID ?? "").trim();

  const sheetId = fromUrl?.sheetId || fromEnvId || DEFAULT_SHEET_ID;
  const gid = fromUrl?.gid || fromEnvGid || DEFAULT_SHEET_GID;

  return { sheetId, gid };
}

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

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PostulacionesEvaluation" (
      "id" TEXT PRIMARY KEY,
      "postulacionIndex" TEXT NOT NULL,
      "evaluatorDiscordId" TEXT NOT NULL,
      "evaluatorName" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "comentarios" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("postulacionIndex", "evaluatorDiscordId")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PostulacionesEvaluation_postulacionIndex_idx"
    ON "PostulacionesEvaluation"("postulacionIndex")
  `);

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

async function loadEvaluations(postulacionIndex: string) {
  try {
    return await prisma.$queryRaw<PostulacionesEvaluationRow[]>`
      SELECT "postulacionIndex", "evaluatorDiscordId", "evaluatorName", "score", "comentarios", "createdAt"
      FROM "PostulacionesEvaluation"
      WHERE "postulacionIndex" = ${postulacionIndex}
      ORDER BY "createdAt" DESC
    `;
  } catch {
    return [];
  }
}

async function loadVotingDeadline() {
  try {
    const result = await prisma.$queryRaw<Array<{ votingDeadlineIso: Date | null }>>`
      SELECT "votingDeadlineIso"
      FROM "PostulacionesSettings"
      WHERE "id" = 1
    `;

    return result[0]?.votingDeadlineIso ?? null;
  } catch {
    return null;
  }
}

async function countStoredResults() {
  try {
    const result = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total
      FROM "PostulacionesResult"
    `;

    return Number(result[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

async function loadStoredResults() {
  try {
    return await prisma.$queryRaw<FinalResultRow[]>`
      SELECT
        "postulacionIndex",
        "candidateName",
        "submittedAt",
        "averageScore",
        "votesCount",
        "status",
        "finalizedAt"
      FROM "PostulacionesResult"
      ORDER BY
        CASE WHEN "averageScore" IS NULL THEN 999 ELSE 0 END,
        "averageScore" DESC,
        "candidateName" ASC
    `;
  } catch {
    return [];
  }
}

async function finalizeResultsIfNeeded(headers: string[], normalizedRows: string[][]) {
  const storedCount = await countStoredResults();
  const expectedCount = normalizedRows.length;
  const candidateNameColumnIndex = resolveCandidateNameColumnIndex(headers);

  if (storedCount === expectedCount && expectedCount > 0) {
    return;
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "PostulacionesResult"`);

  for (let index = 0; index < normalizedRows.length; index += 1) {
    const rowData = normalizedRows[index] ?? [];
    const evaluations = await loadEvaluations(String(index));
    const scores = evaluations.map((evaluation) => evaluation.score);
    const votesCount = scores.length;
    const averageScore = votesCount > 0 ? Number((scores.reduce((a, b) => a + b, 0) / votesCount).toFixed(2)) : null;
    const decision = decideResult(averageScore, votesCount);
    const candidateName = resolveCandidateName(rowData, index, candidateNameColumnIndex);
    const submittedAt = rowData[0] ?? "";
    const resultId = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;

    const rowDataEscaped = escapeSqlLiteral(JSON.stringify(rowData));
    const headersEscaped = escapeSqlLiteral(JSON.stringify(headers));
    const candidateNameEscaped = escapeSqlLiteral(candidateName);
    const submittedAtEscaped = escapeSqlLiteral(submittedAt);
    const decisionReasonEscaped = escapeSqlLiteral(decision.decisionReason);
    const statusEscaped = escapeSqlLiteral(decision.status);
    const resultIdEscaped = escapeSqlLiteral(resultId);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "PostulacionesResult"
      ("id", "postulacionIndex", "candidateName", "submittedAt", "averageScore", "votesCount", "status", "decisionReason", "headersJson", "rowDataJson", "finalizedAt")
      VALUES (
        '${resultIdEscaped}',
        '${index}',
        '${candidateNameEscaped}',
        '${submittedAtEscaped}',
        ${averageScore === null ? "NULL" : averageScore},
        ${votesCount},
        '${statusEscaped}',
        '${decisionReasonEscaped}',
        '${headersEscaped}',
        '${rowDataEscaped}',
        NOW()
      )
    `);
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !canAccessSanctionsByRole(session.user?.staffRole ?? null)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await ensurePostulacionesTablesExist();

  const { sheetId, gid: sheetGid } = resolveSheetSource();

  if (!sheetId) {
    return NextResponse.json(
      {
        error:
          "No se configuró una fuente válida. Usa GOOGLE_POSTULACIONES_SHEET_URL o GOOGLE_POSTULACIONES_SHEET_ID",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${sheetGid}&tqx=out:json`,
      { method: "GET", cache: "no-store" }
    );

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error:
            "No se pudo leer Google Sheets. Verifica que esté compartido para lectura y que el ID/GID sea correcto.",
          details: details.slice(0, 250),
        },
        { status: 502 }
      );
    }

    const rawData = await response.text();
    const parsed = parseGoogleVizPayload(rawData);

    const cols = Array.isArray(parsed.table?.cols) ? parsed.table.cols : [];
    const rows = Array.isArray(parsed.table?.rows) ? parsed.table.rows : [];

    const headers = cols.map((col, index) => {
      const label = (col.label ?? "").trim();
      return label.length > 0 ? label : `Columna ${index + 1}`;
    });

    const normalizedRows = rows
      .map((row) => {
        const cells = Array.isArray(row.c) ? row.c : [];
        return headers.map((_, idx) => normalizeCellValue(cells[idx]));
      })
      .filter(isRowMeaningful);

    const votingDeadline = await loadVotingDeadline();
    const votingClosed = Boolean(votingDeadline && new Date() >= votingDeadline);

    if (votingClosed) {
      await finalizeResultsIfNeeded(headers, normalizedRows);
    }

    const finalizedResults = votingClosed ? await loadStoredResults() : [];
    const currentUserDiscordId = session.user.discordUserId ?? null;
    const evaluators = await fetchEvaluatorsFromDiscord();

    const rowsWithEvaluations = await Promise.all(
      normalizedRows.map(async (row, index) => {
        const evaluations = await loadEvaluations(String(index));
        const scores = evaluations.map((e) => e.score);
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const currentUserVote = currentUserDiscordId
          ? evaluations.find((e) => e.evaluatorDiscordId === currentUserDiscordId)
          : null;

        return {
          rowData: row,
          rowIndex: String(index),
          evaluations,
          averageScore: averageScore !== null ? Number(averageScore.toFixed(2)) : null,
          currentUserVote: currentUserVote
            ? { score: currentUserVote.score, comentarios: currentUserVote.comentarios }
            : null,
        };
      })
    );

    return NextResponse.json(
      {
        headers,
        rows: rowsWithEvaluations,
        votingDeadline,
        votingClosed,
        resultsReady: finalizedResults.length > 0,
        finalizedResults,
        expectedEvaluators: evaluators,
        source: { sheetId, gid: sheetGid },
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      { error: "No se pudieron cargar las postulaciones", details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !canAccessSanctionsByRole(session.user?.staffRole ?? null)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await ensurePostulacionesTablesExist();

  try {
    const body = (await request.json()) as EvaluateRequestBody;
    const { postulacionIndex, score, comentarios } = body;

    if (!postulacionIndex || score === undefined) {
      return NextResponse.json(
        { error: "postulacionIndex y score son obligatorios" },
        { status: 400 }
      );
    }

    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      return NextResponse.json(
        { error: "score debe ser un número entero entre 1 y 5" },
        { status: 400 }
      );
    }

    const votingDeadline = await loadVotingDeadline();
    if (votingDeadline && new Date() >= votingDeadline) {
      return NextResponse.json(
        { error: "El período de votación ha cerrado" },
        { status: 403 }
      );
    }

    const evaluatorDiscordId = session.user.discordUserId ?? "";
    const evaluatorName = session.user.name ?? "Anónimo";

    if (!evaluatorDiscordId) {
      return NextResponse.json(
        { error: "No se pudo identificar el evaluador" },
        { status: 401 }
      );
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const comentariosValue = comentarios ? `'${comentarios.replace(/'/g, "''")}'` : "NULL";
    const evaluatorNameEscaped = evaluatorName.replace(/'/g, "''");
    const postulacionIndexEscaped = postulacionIndex.replace(/'/g, "''");
    const evaluatorDiscordIdEscaped = evaluatorDiscordId.replace(/'/g, "''");

    await prisma.$executeRawUnsafe(`
      INSERT INTO "PostulacionesEvaluation"
      ("id", "postulacionIndex", "evaluatorDiscordId", "evaluatorName", "score", "comentarios", "createdAt", "updatedAt")
      VALUES ('${id}', '${postulacionIndexEscaped}', '${evaluatorDiscordIdEscaped}', '${evaluatorNameEscaped}', ${score}, ${comentariosValue}, NOW(), NOW())
      ON CONFLICT ("postulacionIndex", "evaluatorDiscordId")
      DO UPDATE SET
        "score" = ${score},
        "comentarios" = ${comentariosValue},
        "updatedAt" = NOW()
    `);

    return NextResponse.json(
      {
        success: true,
        message: "Evaluación guardada correctamente",
        evaluation: { postulacionIndex, evaluatorDiscordId, score, comentarios },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      { error: "No se pudo guardar la evaluación", details: message },
      { status: 500 }
    );
  }
}
