import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveStaffRoleFromRoleIds } from "@/lib/discord-staff-roles";

type DiscordGuildMember = {
  roles?: string[];
  user?: {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
  nick?: string | null;
};

type EvaluationRow = {
  supportDiscordId: string;
  evaluatorDiscordId: string;
  evaluatorName: string;
  score: number;
  notes: string | null;
  updatedAt: Date;
};

type SupportSanctionRow = {
  supportDiscordId: string;
  appliedSanction: string;
  fecha: string;
  motivo: string;
  createdAt: Date;
};

type SupportPositivePointRow = {
  supportDiscordId: string;
  pointType: string;
  pointValue: number;
  fecha: string;
  justificacion: string;
  observaciones: string | null;
  createdAt: Date;
};

type EvaluationRequestBody = {
  supportDiscordId?: string;
  score?: number;
  notes?: string;
};

type PromotionSettingsUpdateBody = {
  votingDeadlineIso?: string | null;
};

type PromotionEvaluationSettingsRow = {
  id: number;
  votingDeadlineIso: Date | null;
  createdByDiscordId: string | null;
  updatedAt: Date;
};

type PromotionEvaluationCohortRow = {
  id: string;
  cohortName: string;
  cohortStartDate: string;
  cohortEndDate: string;
  supportDiscordIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

function canEvaluateByRole(roleName: string | null | undefined) {
  return roleName === "Support Lead" || roleName === "Support Trainer";
}

function canManageDeadlineByRole(roleName: string | null | undefined) {
  return roleName === "Support Lead";
}

async function fetchGuildMembers(guildId: string, botToken: string) {
  const collected: DiscordGuildMember[] = [];
  let after = "0";

  for (let page = 0; page < 5; page += 1) {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Discord API error ${response.status}: ${errorText.slice(0, 200) || "Unknown error"}`
      );
    }

    const pageMembers = (await response.json()) as DiscordGuildMember[];
    if (!Array.isArray(pageMembers) || pageMembers.length === 0) {
      break;
    }

    collected.push(...pageMembers);

    const lastMemberId = pageMembers[pageMembers.length - 1]?.user?.id;
    if (!lastMemberId) {
      break;
    }

    after = lastMemberId;

    if (pageMembers.length < 1000) {
      break;
    }
  }

  return collected;
}

function displayNameFor(member: DiscordGuildMember) {
  const id = member.user?.id?.trim() ?? "";
  return (
    member.nick?.trim() ||
    member.user?.global_name?.trim() ||
    member.user?.username?.trim() ||
    id
  );
}

function isValidDiscordId(value: string) {
  return /^\d{17,20}$/.test(value);
}

async function ensureEvaluationTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SupportPromotionEvaluation" (
      "supportDiscordId" TEXT NOT NULL,
      "evaluatorDiscordId" TEXT NOT NULL,
      "evaluatorName" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("supportDiscordId", "evaluatorDiscordId")
    )
  `);
}

async function ensurePromotionSettingsTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PromotionEvaluationSettings" (
      "id" INTEGER PRIMARY KEY,
      "votingDeadlineIso" TIMESTAMP(3),
      "createdByDiscordId" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "PromotionEvaluationSettings" ("id", "votingDeadlineIso", "createdByDiscordId", "updatedAt")
    VALUES (1, NULL, NULL, NOW())
    ON CONFLICT ("id") DO NOTHING
  `);
}

async function ensurePromotionCohortTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PromotionEvaluationCohort" (
      "id" TEXT PRIMARY KEY,
      "cohortName" TEXT NOT NULL,
      "cohortStartDate" TEXT NOT NULL,
      "cohortEndDate" TEXT NOT NULL,
      "supportDiscordIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureDefaultCohort(supportIds: string[]) {
  const { prisma } = await import("@/lib/prisma");

  await ensurePromotionCohortTable();

  await prisma.$executeRaw`
    INSERT INTO "PromotionEvaluationCohort" (
      "id",
      "cohortName",
      "cohortStartDate",
      "cohortEndDate",
      "supportDiscordIds",
      "updatedAt"
    ) VALUES (
      ${"cohort-01"},
      ${"Primera camada"},
      ${"07/03/2026"},
      ${"02/04/2026"},
      ${supportIds},
      NOW()
    )
    ON CONFLICT ("id") DO NOTHING
  `;
}

async function loadPromotionSettings() {
  const { prisma } = await import("@/lib/prisma");
  await ensurePromotionSettingsTable();

  const rows = await prisma.$queryRaw<PromotionEvaluationSettingsRow[]>`
    SELECT
      "id",
      "votingDeadlineIso",
      "createdByDiscordId",
      "updatedAt"
    FROM "PromotionEvaluationSettings"
    WHERE "id" = 1
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function updatePromotionSettings(input: {
  votingDeadlineIso: Date | null;
  createdByDiscordId: string | null;
}) {
  const { prisma } = await import("@/lib/prisma");
  await ensurePromotionSettingsTable();

  await prisma.$executeRaw`
    UPDATE "PromotionEvaluationSettings"
    SET
      "votingDeadlineIso" = ${input.votingDeadlineIso},
      "createdByDiscordId" = ${input.createdByDiscordId},
      "updatedAt" = NOW()
    WHERE "id" = 1
  `;
}

async function loadActiveCohort() {
  const { prisma } = await import("@/lib/prisma");
  await ensurePromotionCohortTable();

  const rows = await prisma.$queryRaw<PromotionEvaluationCohortRow[]>`
    SELECT
      "id",
      "cohortName",
      "cohortStartDate",
      "cohortEndDate",
      "supportDiscordIds",
      "createdAt",
      "updatedAt"
    FROM "PromotionEvaluationCohort"
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function loadEvaluations() {
  const { prisma } = await import("@/lib/prisma");
  await ensureEvaluationTable();

  return prisma.$queryRaw<EvaluationRow[]>`
    SELECT
      "supportDiscordId",
      "evaluatorDiscordId",
      "evaluatorName",
      "score",
      "notes",
      "updatedAt"
    FROM "SupportPromotionEvaluation"
  `;
}

async function loadSupportSanctions() {
  const { prisma } = await import("@/lib/prisma");

  return prisma.$queryRaw<SupportSanctionRow[]>`
    SELECT
      "supportDiscordId",
      "appliedSanction",
      "fecha",
      "motivo",
      "createdAt"
    FROM "StaffSanction"
    ORDER BY "createdAt" DESC
  `;
}

async function loadSupportPositivePoints() {
  const { prisma } = await import("@/lib/prisma");

  return prisma.$queryRaw<SupportPositivePointRow[]>`
    SELECT
      "supportDiscordId",
      "pointType",
      "pointValue",
      "fecha",
      "justificacion",
      "observaciones",
      "createdAt"
    FROM "StaffPositivePoints"
    ORDER BY "createdAt" DESC
  `;
}

async function loadRoster() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured");
  }

  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const members = await fetchGuildMembers(guildId, botToken);

  const supports = members
    .map((member) => {
      const userId = member.user?.id?.trim() ?? "";
      if (!isValidDiscordId(userId)) {
        return null;
      }

      const roleIds = Array.isArray(member.roles) ? member.roles : [];
      const roleResolution = resolveStaffRoleFromRoleIds(roleIds);

      if (roleResolution.roleName !== "Support") {
        return null;
      }

      return {
        id: userId,
        displayName: displayNameFor(member),
        username: member.user?.username?.trim() ?? "",
      };
    })
    .filter((item): item is { id: string; displayName: string; username: string } => Boolean(item))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }));

  const evaluators: Array<{
    id: string;
    displayName: string;
    roleName: "Support Lead" | "Support Trainer";
  }> = [];

  for (const member of members) {
    const userId = member.user?.id?.trim() ?? "";
    if (!isValidDiscordId(userId)) {
      continue;
    }

    const roleIds = Array.isArray(member.roles) ? member.roles : [];
    const roleResolution = resolveStaffRoleFromRoleIds(roleIds);

    if (roleResolution.roleName !== "Support Lead" && roleResolution.roleName !== "Support Trainer") {
      continue;
    }

    evaluators.push({
      id: userId,
      displayName: displayNameFor(member),
      roleName: roleResolution.roleName,
    });
  }

  evaluators.sort((a, b) => a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }));

  return {
    supports,
    evaluators,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!canEvaluateByRole(session?.user?.staffRole ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const roster = await loadRoster();
    await ensureDefaultCohort(roster.supports.map((item) => item.id));

    const [rows, sanctionRows, positivePointRows, settingsRow, activeCohort] = await Promise.all([
      loadEvaluations(),
      loadSupportSanctions(),
      loadSupportPositivePoints(),
      loadPromotionSettings(),
      loadActiveCohort(),
    ]);
    const effectiveRoster = roster;
    const requiredEvaluations = effectiveRoster.evaluators.length;
    const votingDeadlineIso = settingsRow?.votingDeadlineIso ? new Date(settingsRow.votingDeadlineIso) : null;
    const votingClosed = Boolean(votingDeadlineIso && votingDeadlineIso.getTime() <= Date.now());

    const rowsBySupport = new Map<string, EvaluationRow[]>();
    const sanctionsBySupport = new Map<string, SupportSanctionRow[]>();
    const positivePointsBySupport = new Map<string, SupportPositivePointRow[]>();

    for (const row of rows) {
      const currentRows = rowsBySupport.get(row.supportDiscordId) ?? [];
      currentRows.push(row);
      rowsBySupport.set(row.supportDiscordId, currentRows);
    }

    for (const sanctionRow of sanctionRows) {
      const currentRows = sanctionsBySupport.get(sanctionRow.supportDiscordId) ?? [];
      currentRows.push(sanctionRow);
      sanctionsBySupport.set(sanctionRow.supportDiscordId, currentRows);
    }

    for (const positivePointRow of positivePointRows) {
      const currentRows = positivePointsBySupport.get(positivePointRow.supportDiscordId) ?? [];
      currentRows.push(positivePointRow);
      positivePointsBySupport.set(positivePointRow.supportDiscordId, currentRows);
    }

    const supports = effectiveRoster.supports.map((support) => {
      const supportRows = rowsBySupport.get(support.id) ?? [];
      const supportSanctions = sanctionsBySupport.get(support.id) ?? [];
      const supportPositivePoints = positivePointsBySupport.get(support.id) ?? [];
      const completed = supportRows.length;
      const totalScore = supportRows.reduce((sum, row) => sum + row.score, 0);
      const average = completed > 0 ? Number((totalScore / completed).toFixed(2)) : null;
      const allEvaluated = requiredEvaluations > 0 && completed >= requiredEvaluations;
      const totalPositivePoints = supportPositivePoints.reduce(
        (sum, row) => sum + Number(row.pointValue ?? 0),
        0
      );
      const averageScoreWithFallback = average;
      const canFinalizeByDeadline = votingClosed && completed > 0;
      const isFinalized = allEvaluated || canFinalizeByDeadline;
      const missingEvaluations = Math.max(0, requiredEvaluations - completed);

      const evaluatorIds = new Set(supportRows.map((row) => row.evaluatorDiscordId));
      const pendingEvaluators = effectiveRoster.evaluators
        .filter((evaluator) => !evaluatorIds.has(evaluator.id))
        .map((evaluator) => evaluator.displayName);

      const myEvaluation = supportRows.find(
        (row) => row.evaluatorDiscordId === session?.user?.discordUserId
      );

      return {
        id: support.id,
        displayName: support.displayName,
        username: support.username,
        completedEvaluations: completed,
        requiredEvaluations,
        averageScore: averageScoreWithFallback,
        decision: isFinalized
          ? (averageScoreWithFallback ?? 0) >= 7
            ? "Pasa"
            : "No Pasa"
          : "Pendiente",
        pendingEvaluators,
        autoAveragedMissingVotes: isFinalized ? missingEvaluations : 0,
        evaluations: supportRows.map((row) => ({
          evaluatorName: row.evaluatorName,
          score: row.score,
          notes: row.notes,
          updatedAt: row.updatedAt,
        })),
        myEvaluation: myEvaluation
          ? {
              score: myEvaluation.score,
              notes: myEvaluation.notes,
            }
          : null,
        sanctionsSummary:
          supportSanctions.length === 0
            ? {
                hasSanctions: false,
                total: 0,
                text: "Sin sanciones registradas.",
                latest: [],
              }
            : {
                hasSanctions: true,
                total: supportSanctions.length,
                text: `${supportSanctions.length} sancion(es) registradas.`,
                latest: supportSanctions.slice(0, 5).map((sanction) => ({
                  appliedSanction: sanction.appliedSanction,
                  fecha: sanction.fecha,
                  motivo: sanction.motivo,
                })),
              },
        positivePointsSummary:
          supportPositivePoints.length === 0
            ? {
                hasPositivePoints: false,
                totalRecords: 0,
                totalPoints: 0,
                text: "Sin puntos positivos registrados.",
                latest: [],
              }
            : {
                hasPositivePoints: true,
                totalRecords: supportPositivePoints.length,
                totalPoints: Number(totalPositivePoints.toFixed(2)),
                text: `${supportPositivePoints.length} registro(s), ${Number(totalPositivePoints.toFixed(2))} punto(s) acumulado(s).`,
                latest: supportPositivePoints.slice(0, 5).map((point) => ({
                  pointType: point.pointType,
                  pointValue: Number(point.pointValue),
                  fecha: point.fecha,
                  justificacion: point.justificacion,
                  observaciones: point.observaciones,
                })),
              },
      };
    });

    return NextResponse.json({
      supports,
      evaluators: effectiveRoster.evaluators,
      voting: {
        deadlineIso: votingDeadlineIso ? votingDeadlineIso.toISOString() : null,
        isClosed: votingClosed,
        managedByDiscordId: settingsRow?.createdByDiscordId ?? null,
      },
      cohort: activeCohort
        ? {
            id: activeCohort.id,
            name: activeCohort.cohortName,
            startDate: activeCohort.cohortStartDate,
            endDate: activeCohort.cohortEndDate,
            supportDiscordIds: activeCohort.supportDiscordIds,
          }
        : null,
      permissions: {
        canManageDeadline: canManageDeadlineByRole(session?.user?.staffRole ?? null),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser?.id || !canEvaluateByRole(sessionUser.staffRole ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isValidDiscordId(sessionUser.discordUserId ?? "")) {
    return NextResponse.json({ error: "Sesion sin discordUserId valido" }, { status: 400 });
  }

  let body: EvaluationRequestBody;
  try {
    body = (await request.json()) as EvaluationRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const supportDiscordId = body.supportDiscordId?.trim() ?? "";
  const score = Number(body.score);
  const notes = body.notes?.trim() ?? "";

  if (!isValidDiscordId(supportDiscordId)) {
    return NextResponse.json({ error: "supportDiscordId invalido" }, { status: 400 });
  }

  if (!Number.isFinite(score) || score < 1 || score > 10) {
    return NextResponse.json({ error: "score debe estar entre 1 y 10" }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const roster = await loadRoster();
    const settingsRow = await loadPromotionSettings();
    const votingDeadlineIso = settingsRow?.votingDeadlineIso ? new Date(settingsRow.votingDeadlineIso) : null;

    if (votingDeadlineIso && votingDeadlineIso.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "El plazo de votacion ya finalizo. La votacion esta cerrada." },
        { status: 409 }
      );
    }

    if (!roster.supports.some((support) => support.id === supportDiscordId)) {
      return NextResponse.json({ error: "El miembro no pertenece al rango Support" }, { status: 400 });
    }

    if (!roster.evaluators.some((evaluator) => evaluator.id === sessionUser.discordUserId)) {
      return NextResponse.json({ error: "No perteneces al grupo evaluador" }, { status: 403 });
    }

    await ensureEvaluationTable();

    const existing = await prisma.$queryRaw<Array<{ evaluatorDiscordId: string }>>`
      SELECT "evaluatorDiscordId"
      FROM "SupportPromotionEvaluation"
      WHERE "supportDiscordId" = ${supportDiscordId}
        AND "evaluatorDiscordId" = ${sessionUser.discordUserId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Tu evaluación ya fue registrada y no se puede modificar." },
        { status: 409 }
      );
    }

    await prisma.$executeRaw`
      INSERT INTO "SupportPromotionEvaluation" (
        "supportDiscordId",
        "evaluatorDiscordId",
        "evaluatorName",
        "score",
        "notes",
        "updatedAt"
      ) VALUES (
        ${supportDiscordId},
        ${sessionUser.discordUserId},
        ${sessionUser.name ?? "-"},
        ${Math.round(score)},
        ${notes.length > 0 ? notes : null},
        NOW()
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser?.id || !canManageDeadlineByRole(sessionUser.staffRole ?? null)) {
    return NextResponse.json({ error: "Solo Support Lead puede gestionar el plazo." }, { status: 403 });
  }

  let body: PromotionSettingsUpdateBody;
  try {
    body = (await request.json()) as PromotionSettingsUpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawDeadline = body.votingDeadlineIso;
  let nextDeadline: Date | null = null;

  if (typeof rawDeadline === "string" && rawDeadline.trim().length > 0) {
    const parsed = new Date(rawDeadline);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Fecha limite invalida" }, { status: 400 });
    }

    nextDeadline = parsed;
  }

  try {
    await updatePromotionSettings({
      votingDeadlineIso: nextDeadline,
      createdByDiscordId: sessionUser.discordUserId ?? null,
    });

    return NextResponse.json({
      ok: true,
      voting: {
        deadlineIso: nextDeadline ? nextDeadline.toISOString() : null,
        isClosed: Boolean(nextDeadline && nextDeadline.getTime() <= Date.now()),
        managedByDiscordId: sessionUser.discordUserId ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
