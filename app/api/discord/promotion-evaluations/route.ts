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
  stage?: "first" | "second";
};

type PromotionSettingsUpdateBody = {
  votingDeadlineIso?: string | null;
};

type PromotionEvaluationSettingsRow = {
  id: number;
  votingDeadlineIso: Date | null;
  createdByDiscordId: string | null;
  secondEvaluationEnabled: boolean;
  closeProcessedAt: Date | null;
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

type PromotionCohortCutRow = {
  id: string;
  cohortId: string;
  cutNumber: number;
  targetRank: string;
  state: "pending" | "in_progress" | "completed";
  startDateIso: Date;
  endDateIso: Date | null;
  improvementPeriodEndIso: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PromotionCutEvaluationRow = {
  supportDiscordId: string;
  cohortId: string;
  cutNumber: number;
  result: "pass" | "fail" | null;
  resultAt: Date | null;
  nextAction: "promoted" | "improvement_period" | "retiro" | null;
  createdAt: Date;
  updatedAt: Date;
};

type SecondEvaluationCandidateRow = {
  supportDiscordId: string;
  previousAverageScore: number | null;
  previousCompletedEvaluations: number;
  movedAt: Date;
  updatedAt: Date;
};

type SecondEvaluationRow = {
  supportDiscordId: string;
  evaluatorDiscordId: string;
  evaluatorName: string;
  score: number;
  notes: string | null;
  updatedAt: Date;
};

type FirstRoundHistoryRow = {
  supportDiscordId: string;
  evaluatorDiscordId: string;
  evaluatorName: string;
  score: number;
  notes: string | null;
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

async function ensurePromotionCohortArchiveTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PromotionCohortArchive" (
      "id" TEXT PRIMARY KEY,
      "cohortName" TEXT NOT NULL,
      "cohortStartDate" TEXT NOT NULL,
      "cohortEndDate" TEXT NOT NULL,
      "votingDeadlineIso" TIMESTAMP(3),
      "totalMembers" INTEGER NOT NULL,
      "passedMembers" INTEGER NOT NULL,
      "failedMembers" INTEGER NOT NULL,
      "memberResults" JSONB NOT NULL,
      "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "closedByDiscordId" TEXT
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_PromotionCohortArchive_archivedAt"
    ON "PromotionCohortArchive" ("archivedAt" DESC)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_PromotionCohortArchive_cohortName"
    ON "PromotionCohortArchive" ("cohortName")
  `);
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
      "secondEvaluationEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
      "closeProcessedAt" TIMESTAMP(3),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PromotionEvaluationSettings"
    ADD COLUMN IF NOT EXISTS "secondEvaluationEnabled" BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PromotionEvaluationSettings"
    ADD COLUMN IF NOT EXISTS "closeProcessedAt" TIMESTAMP(3)
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
      "secondEvaluationEnabled",
      "closeProcessedAt",
      "updatedAt"
    FROM "PromotionEvaluationSettings"
    WHERE "id" = 1
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function ensureSecondEvaluationCandidateTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PromotionSecondEvaluationCandidate" (
      "supportDiscordId" TEXT PRIMARY KEY,
      "previousAverageScore" DOUBLE PRECISION,
      "previousCompletedEvaluations" INTEGER NOT NULL DEFAULT 0,
      "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureSecondEvaluationTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SupportPromotionSecondEvaluation" (
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

async function ensureFirstRoundHistoryTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SupportPromotionEvaluationHistory" (
      "supportDiscordId" TEXT NOT NULL,
      "evaluatorDiscordId" TEXT NOT NULL,
      "evaluatorName" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "notes" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      "roundNumber" INTEGER NOT NULL DEFAULT 1,
      "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("supportDiscordId", "evaluatorDiscordId", "roundNumber")
    )
  `);
}

async function loadSecondEvaluationCandidates() {
  const { prisma } = await import("@/lib/prisma");
  await ensureSecondEvaluationCandidateTable();

  return prisma.$queryRaw<SecondEvaluationCandidateRow[]>`
    SELECT
      "supportDiscordId",
      "previousAverageScore",
      "previousCompletedEvaluations",
      "movedAt",
      "updatedAt"
    FROM "PromotionSecondEvaluationCandidate"
    ORDER BY "movedAt" ASC
  `;
}

async function loadSecondEvaluations() {
  const { prisma } = await import("@/lib/prisma");
  await ensureSecondEvaluationTable();

  return prisma.$queryRaw<SecondEvaluationRow[]>`
    SELECT
      "supportDiscordId",
      "evaluatorDiscordId",
      "evaluatorName",
      "score",
      "notes",
      "updatedAt"
    FROM "SupportPromotionSecondEvaluation"
  `;
}

async function loadFirstRoundHistory() {
  const { prisma } = await import("@/lib/prisma");
  await ensureFirstRoundHistoryTable();

  return prisma.$queryRaw<FirstRoundHistoryRow[]>`
    SELECT
      "supportDiscordId",
      "evaluatorDiscordId",
      "evaluatorName",
      "score",
      "notes",
      "updatedAt"
    FROM "SupportPromotionEvaluationHistory"
    WHERE "roundNumber" = 1
    ORDER BY "updatedAt" ASC
  `;
}

async function processVotingClosureTransition(input: {
  settingsRow: PromotionEvaluationSettingsRow;
  roster: Awaited<ReturnType<typeof loadRoster>>;
}) {
  const { settingsRow, roster } = input;
  const votingDeadlineIso = settingsRow.votingDeadlineIso ? new Date(settingsRow.votingDeadlineIso) : null;
  const votingClosed = Boolean(votingDeadlineIso && votingDeadlineIso.getTime() <= Date.now());

  if (!votingClosed || settingsRow.closeProcessedAt) {
    return;
  }

  const { prisma } = await import("@/lib/prisma");
  await ensureEvaluationTable();
  await ensureSecondEvaluationCandidateTable();
  await ensureSecondEvaluationTable();
  await ensureFirstRoundHistoryTable();

  const firstRoundRows = await loadEvaluations();
  const requiredEvaluations = roster.evaluators.length;
  const rowsBySupport = new Map<string, EvaluationRow[]>();

  for (const row of firstRoundRows) {
    const currentRows = rowsBySupport.get(row.supportDiscordId) ?? [];
    currentRows.push(row);
    rowsBySupport.set(row.supportDiscordId, currentRows);
  }

  for (const support of roster.supports) {
    const supportRows = rowsBySupport.get(support.id) ?? [];
    const completed = supportRows.length;
    const totalScore = supportRows.reduce((sum, row) => sum + row.score, 0);
    const average = completed > 0 ? Number((totalScore / completed).toFixed(2)) : null;
    const allEvaluated = requiredEvaluations > 0 && completed >= requiredEvaluations;
    const canFinalizeByDeadline = completed > 0;
    const isFinalized = allEvaluated || canFinalizeByDeadline;
    const passed = isFinalized && (average ?? 0) >= 7;

    if (passed) {
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "PromotionSecondEvaluationCandidate" (
        "supportDiscordId",
        "previousAverageScore",
        "previousCompletedEvaluations",
        "updatedAt"
      ) VALUES (
        ${support.id},
        ${average},
        ${completed},
        NOW()
      )
      ON CONFLICT ("supportDiscordId") DO UPDATE
      SET
        "previousAverageScore" = EXCLUDED."previousAverageScore",
        "previousCompletedEvaluations" = EXCLUDED."previousCompletedEvaluations",
        "updatedAt" = NOW()
    `;

    for (const row of supportRows) {
      await prisma.$executeRaw`
        INSERT INTO "SupportPromotionEvaluationHistory" (
          "supportDiscordId",
          "evaluatorDiscordId",
          "evaluatorName",
          "score",
          "notes",
          "updatedAt",
          "roundNumber"
        ) VALUES (
          ${row.supportDiscordId},
          ${row.evaluatorDiscordId},
          ${row.evaluatorName},
          ${row.score},
          ${row.notes},
          ${row.updatedAt},
          1
        )
        ON CONFLICT ("supportDiscordId", "evaluatorDiscordId", "roundNumber") DO NOTHING
      `;
    }

    await prisma.$executeRaw`
      DELETE FROM "SupportPromotionEvaluation"
      WHERE "supportDiscordId" = ${support.id}
    `;
  }

  // Archive the completed cohort
  const activeCohort = await loadActiveCohort();
  if (activeCohort) {
    await ensurePromotionCohortArchiveTable();

    // Calculate final results for all supports
    const allResults: Array<{
      displayName: string;
      decision: "Pasa" | "No Pasa" | "Pendiente";
      stage: string;
      averageScore: number | null;
    }> = [];

    for (const support of roster.supports) {
      const supportRows = rowsBySupport.get(support.id) ?? [];
      const completed = supportRows.length;
      const totalScore = supportRows.reduce((sum, row) => sum + row.score, 0);
      const average = completed > 0 ? Number((totalScore / completed).toFixed(2)) : null;
      const allEvaluated = requiredEvaluations > 0 && completed >= requiredEvaluations;
      const canFinalizeByDeadline = completed > 0;
      const isFinalized = allEvaluated || canFinalizeByDeadline;
      const decision: "Pasa" | "No Pasa" | "Pendiente" = isFinalized
        ? (average ?? 0) >= 7
          ? "Pasa"
          : "No Pasa"
        : "Pendiente";

      allResults.push({
        displayName: support.displayName,
        decision,
        stage: decision === "Pasa" ? "Primera ronda" : "Segunda ronda",
        averageScore: average,
      });
    }

    const passedCount = allResults.filter((r) => r.decision === "Pasa").length;
    const failedCount = allResults.filter((r) => r.decision === "No Pasa").length;

    await prisma.$executeRaw`
      INSERT INTO "PromotionCohortArchive" (
        "id",
        "cohortName",
        "cohortStartDate",
        "cohortEndDate",
        "votingDeadlineIso",
        "totalMembers",
        "passedMembers",
        "failedMembers",
        "memberResults",
        "archivedAt",
        "closedByDiscordId"
      ) VALUES (
        ${activeCohort.id + "-archived"},
        ${activeCohort.cohortName},
        ${activeCohort.cohortStartDate},
        ${activeCohort.cohortEndDate},
        ${votingDeadlineIso},
        ${roster.supports.length},
        ${passedCount},
        ${failedCount},
        ${JSON.stringify(allResults)},
        NOW(),
        ${null}
      )
    `;

    // Clear the active cohort
    await prisma.$executeRaw`
      DELETE FROM "PromotionEvaluationCohort"
      WHERE "id" = ${activeCohort.id}
    `;

    // Clear second evaluation candidates and related tables
    await prisma.$executeRaw`
      DELETE FROM "PromotionSecondEvaluationCandidate"
    `;

    await prisma.$executeRaw`
      DELETE FROM "SupportPromotionSecondEvaluation"
    `;

    await prisma.$executeRaw`
      DELETE FROM "SupportPromotionEvaluationHistory"
    `;
  }

  await prisma.$executeRaw`
    UPDATE "PromotionEvaluationSettings"
    SET
      "secondEvaluationEnabled" = FALSE,
      "closeProcessedAt" = NOW(),
      "votingDeadlineIso" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = 1
  `;
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

async function ensurePromotionCohortCutTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PromotionCohortCut" (
      "id" TEXT PRIMARY KEY,
      "cohortId" TEXT NOT NULL,
      "cutNumber" INTEGER NOT NULL,
      "targetRank" TEXT NOT NULL,
      "state" TEXT NOT NULL DEFAULT 'pending',
      "startDateIso" TIMESTAMP(3) NOT NULL,
      "endDateIso" TIMESTAMP(3),
      "improvementPeriodEndIso" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("cohortId", "cutNumber")
    )
  `);
}

async function ensurePromotionCutEvaluationTable() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PromotionCutEvaluation" (
      "supportDiscordId" TEXT NOT NULL,
      "cohortId" TEXT NOT NULL,
      "cutNumber" INTEGER NOT NULL,
      "result" TEXT,
      "resultAt" TIMESTAMP(3),
      "nextAction" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("supportDiscordId", "cohortId", "cutNumber")
    )
  `);
}

async function initializeCohortCuts(cohortId: string) {
  const { prisma } = await import("@/lib/prisma");
  await ensurePromotionCohortCutTable();

  const now = new Date();
  const cut1EndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const improvementEnd = new Date(cut1EndDate.getTime() + 15 * 24 * 60 * 60 * 1000);
  const cut2EndDate = new Date(improvementEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO "PromotionCohortCut" (
      "id",
      "cohortId",
      "cutNumber",
      "targetRank",
      "state",
      "startDateIso",
      "endDateIso",
      "improvementPeriodEndIso",
      "updatedAt"
    ) VALUES 
      (${"cut-" + cohortId + "-1"}, ${cohortId}, 1, ${"Trial Admin"}, ${"pending"}, ${now}, ${cut1EndDate}, ${improvementEnd}, NOW()),
      (${"cut-" + cohortId + "-2"}, ${cohortId}, 2, ${"Game Admin Level 1"}, ${"pending"}, ${improvementEnd}, ${cut2EndDate}, NULL, NOW())
    ON CONFLICT ("cohortId", "cutNumber") DO NOTHING
  `;
}

async function loadActiveCohortCut(cohortId: string, cutNumber: number) {
  const { prisma } = await import("@/lib/prisma");
  await ensurePromotionCohortCutTable();

  const rows = await prisma.$queryRaw<PromotionCohortCutRow[]>`
    SELECT
      "id",
      "cohortId",
      "cutNumber",
      "targetRank",
      "state",
      "startDateIso",
      "endDateIso",
      "improvementPeriodEndIso",
      "createdAt",
      "updatedAt"
    FROM "PromotionCohortCut"
    WHERE "cohortId" = ${cohortId} AND "cutNumber" = ${cutNumber}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function loadSupportCutEvaluation(supportDiscordId: string, cohortId: string, cutNumber: number) {
  const { prisma } = await import("@/lib/prisma");
  await ensurePromotionCutEvaluationTable();

  const rows = await prisma.$queryRaw<PromotionCutEvaluationRow[]>`
    SELECT
      "supportDiscordId",
      "cohortId",
      "cutNumber",
      "result",
      "resultAt",
      "nextAction",
      "createdAt",
      "updatedAt"
    FROM "PromotionCutEvaluation"
    WHERE "supportDiscordId" = ${supportDiscordId} AND "cohortId" = ${cohortId} AND "cutNumber" = ${cutNumber}
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

    let settingsRow = await loadPromotionSettings();
    if (settingsRow) {
      await processVotingClosureTransition({
        settingsRow,
        roster,
      });
      settingsRow = await loadPromotionSettings();
    }

    const [rows, secondEvaluationCandidates, secondEvaluationRows, firstRoundHistoryRows, sanctionRows, positivePointRows, activeCohort] = await Promise.all([
      loadEvaluations(),
      loadSecondEvaluationCandidates(),
      loadSecondEvaluations(),
      loadFirstRoundHistory(),
      loadSupportSanctions(),
      loadSupportPositivePoints(),
      loadActiveCohort(),
    ]);

    if (activeCohort) {
      await initializeCohortCuts(activeCohort.id);
    }

    const secondEvaluationEnabled = Boolean(settingsRow?.secondEvaluationEnabled);
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

    const firstRoundSupportIds = new Set(rows.map((row) => row.supportDiscordId));
    const supportsForFirstEvaluation = secondEvaluationEnabled
      ? effectiveRoster.supports.filter((support) => firstRoundSupportIds.has(support.id))
      : effectiveRoster.supports;

    const secondEvaluationRowsBySupport = new Map<string, SecondEvaluationRow[]>();
    const firstRoundHistoryBySupport = new Map<string, FirstRoundHistoryRow[]>();

    for (const row of secondEvaluationRows) {
      const currentRows = secondEvaluationRowsBySupport.get(row.supportDiscordId) ?? [];
      currentRows.push(row);
      secondEvaluationRowsBySupport.set(row.supportDiscordId, currentRows);
    }

    for (const row of firstRoundHistoryRows) {
      const currentRows = firstRoundHistoryBySupport.get(row.supportDiscordId) ?? [];
      currentRows.push(row);
      firstRoundHistoryBySupport.set(row.supportDiscordId, currentRows);
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

    const [cut1, cut2] = activeCohort
      ? await Promise.all([
          loadActiveCohortCut(activeCohort.id, 1),
          loadActiveCohortCut(activeCohort.id, 2),
        ])
      : [null, null];

    const supports = supportsForFirstEvaluation.map(async (support) => {
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
      const canFinalizeByDeadline = (votingClosed || secondEvaluationEnabled) && completed > 0;
      const isFinalized = allEvaluated || canFinalizeByDeadline;
      const missingEvaluations = Math.max(0, requiredEvaluations - completed);

      const evaluatorIds = new Set(supportRows.map((row) => row.evaluatorDiscordId));
      const pendingEvaluators = effectiveRoster.evaluators
        .filter((evaluator) => !evaluatorIds.has(evaluator.id))
        .map((evaluator) => evaluator.displayName);

      const myEvaluation = supportRows.find(
        (row) => row.evaluatorDiscordId === session?.user?.discordUserId
      );

      const cut1Eval = activeCohort ? await loadSupportCutEvaluation(support.id, activeCohort.id, 1) : null;
      const cut2Eval = activeCohort ? await loadSupportCutEvaluation(support.id, activeCohort.id, 2) : null;
      const now = new Date();
      const inImprovementPeriod = cut1 && cut1.improvementPeriodEndIso && now.getTime() < new Date(cut1.improvementPeriodEndIso).getTime() && cut1Eval?.result === "fail";
      const activeCutNumber = cut1 && now.getTime() < new Date(cut1.endDateIso ?? '2099-12-31').getTime() ? 1 : cut2 && now.getTime() < new Date(cut2.endDateIso ?? '2099-12-31').getTime() ? 2 : 0;
      const cutStatus = activeCutNumber === 1 ? cut1Eval?.result === "pass" ? "aprobado_corte_1" : cut1Eval ? "rechazado_corte_1_en_mejora" : "pendiente_corte_1" : activeCutNumber === 2 ? cut2Eval?.result === "pass" ? "aprobado_corte_2" : cut2Eval?.result === "fail" ? "rechazado_corte_2_retiro" : "pendiente_corte_2" : "sin_cortes";

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
        cutStatus,
        activeCutNumber,
        inImprovementPeriod: Boolean(inImprovementPeriod),
      };
    });

    const supportsResolved = await Promise.all(supports);

    const supportById = new Map(effectiveRoster.supports.map((support) => [support.id, support]));

    const secondSupports = secondEvaluationCandidates.map((candidate) => {
      const support = supportById.get(candidate.supportDiscordId);
      const supportRows = secondEvaluationRowsBySupport.get(candidate.supportDiscordId) ?? [];
      const previousRows = firstRoundHistoryBySupport.get(candidate.supportDiscordId) ?? [];
      const completed = supportRows.length;
      const totalScore = supportRows.reduce((sum, row) => sum + row.score, 0);
      const average = completed > 0 ? Number((totalScore / completed).toFixed(2)) : null;

      const evaluatorIds = new Set(supportRows.map((row) => row.evaluatorDiscordId));
      const pendingEvaluators = effectiveRoster.evaluators
        .filter((evaluator) => !evaluatorIds.has(evaluator.id))
        .map((evaluator) => evaluator.displayName);

      const myEvaluation = supportRows.find(
        (row) => row.evaluatorDiscordId === session?.user?.discordUserId
      );

      const decision: "Pasa" | "No Pasa" | "Pendiente" =
        completed === 0 ? "Pendiente" : (average ?? 0) >= 7 ? "Pasa" : "No Pasa";

      return {
        id: candidate.supportDiscordId,
        displayName: support?.displayName ?? candidate.supportDiscordId,
        username: support?.username ?? "",
        completedEvaluations: completed,
        requiredEvaluations,
        averageScore: average,
        decision,
        pendingEvaluators,
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
        previousRound: {
          averageScore: candidate.previousAverageScore,
          completedEvaluations: candidate.previousCompletedEvaluations,
          evaluations: previousRows.map((row) => ({
            evaluatorName: row.evaluatorName,
            score: row.score,
            notes: row.notes,
            updatedAt: row.updatedAt,
          })),
        },
      };
    });

    return NextResponse.json({
      supports: supportsResolved,
      secondEvaluation: {
        enabled: secondEvaluationEnabled,
        supports: secondSupports,
      },
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
      cuts: {
        cut1: cut1
          ? {
              id: cut1.id,
              cutNumber: cut1.cutNumber,
              targetRank: cut1.targetRank,
              state: cut1.state,
              startDateIso: cut1.startDateIso?.toISOString() ?? null,
              endDateIso: cut1.endDateIso?.toISOString() ?? null,
              improvementPeriodEndIso: cut1.improvementPeriodEndIso?.toISOString() ?? null,
            }
          : null,
        cut2: cut2
          ? {
              id: cut2.id,
              cutNumber: cut2.cutNumber,
              targetRank: cut2.targetRank,
              state: cut2.state,
              startDateIso: cut2.startDateIso?.toISOString() ?? null,
              endDateIso: cut2.endDateIso?.toISOString() ?? null,
              improvementPeriodEndIso: cut2.improvementPeriodEndIso?.toISOString() ?? null,
            }
          : null,
      },
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
  const stage = body.stage === "second" ? "second" : "first";

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

    if (stage === "first") {
      if (settingsRow?.secondEvaluationEnabled) {
        return NextResponse.json(
          { error: "La primera votacion ya fue cerrada. Debes usar Segunda evaluación." },
          { status: 409 }
        );
      }

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
    }

    if (!roster.evaluators.some((evaluator) => evaluator.id === sessionUser.discordUserId)) {
      return NextResponse.json({ error: "No perteneces al grupo evaluador" }, { status: 403 });
    }

    if (stage === "first") {
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
    } else {
      if (!settingsRow?.secondEvaluationEnabled) {
        return NextResponse.json(
          { error: "La Segunda evaluación aun no esta habilitada." },
          { status: 409 }
        );
      }

      await ensureSecondEvaluationCandidateTable();
      await ensureSecondEvaluationTable();

      const candidateRows = await prisma.$queryRaw<Array<{ supportDiscordId: string }>>`
        SELECT "supportDiscordId"
        FROM "PromotionSecondEvaluationCandidate"
        WHERE "supportDiscordId" = ${supportDiscordId}
        LIMIT 1
      `;

      if (candidateRows.length === 0) {
        return NextResponse.json(
          { error: "El miembro no pertenece al listado de Segunda evaluación." },
          { status: 400 }
        );
      }

      const existing = await prisma.$queryRaw<Array<{ evaluatorDiscordId: string }>>`
        SELECT "evaluatorDiscordId"
        FROM "SupportPromotionSecondEvaluation"
        WHERE "supportDiscordId" = ${supportDiscordId}
          AND "evaluatorDiscordId" = ${sessionUser.discordUserId}
        LIMIT 1
      `;

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Tu evaluación de Segunda evaluación ya fue registrada y no se puede modificar." },
          { status: 409 }
        );
      }

      await prisma.$executeRaw`
        INSERT INTO "SupportPromotionSecondEvaluation" (
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
    }

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
