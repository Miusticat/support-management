import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type ArchivedCohort = {
  id: string;
  cohortName: string;
  cohortStartDate: string;
  cohortEndDate: string;
  votingDeadlineIso: string | null;
  totalMembers: number;
  passedMembers: number;
  failedMembers: number;
  memberResults: Array<{
    displayName: string;
    decision: "Pasa" | "No Pasa" | "Pendiente";
    stage: string;
    averageScore: number | null;
  }>;
  archivedAt: string;
  closedByDiscordId: string | null;
};

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
}

async function loadArchivedCohorts(): Promise<ArchivedCohort[]> {
  const { prisma } = await import("@/lib/prisma");
  await ensurePromotionCohortArchiveTable();

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      cohortName: string;
      cohortStartDate: string;
      cohortEndDate: string;
      votingDeadlineIso: Date | null;
      totalMembers: number;
      passedMembers: number;
      failedMembers: number;
      memberResults: string | object;
      archivedAt: Date;
      closedByDiscordId: string | null;
    }>
  >`
    SELECT
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
    FROM "PromotionCohortArchive"
    ORDER BY "archivedAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    cohortName: row.cohortName,
    cohortStartDate: row.cohortStartDate,
    cohortEndDate: row.cohortEndDate,
    votingDeadlineIso: row.votingDeadlineIso ? new Date(row.votingDeadlineIso).toISOString() : null,
    totalMembers: row.totalMembers,
    passedMembers: row.passedMembers,
    failedMembers: row.failedMembers,
    memberResults: typeof row.memberResults === "string" ? JSON.parse(row.memberResults) : row.memberResults,
    archivedAt: new Date(row.archivedAt).toISOString(),
    closedByDiscordId: row.closedByDiscordId,
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const currentRole = session?.user?.staffRole ?? null;
  const canAccess = currentRole === "Support Lead" || currentRole === "Support Trainer";

  if (!canAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cohorts = await loadArchivedCohorts();
    return NextResponse.json({ cohorts }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
