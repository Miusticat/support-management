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

type EvaluationRequestBody = {
  supportDiscordId?: string;
  score?: number;
  notes?: string;
};

function canEvaluateByRole(roleName: string | null | undefined) {
  return roleName === "Support Lead" || roleName === "Support Trainer";
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
    const [roster, rows, sanctionRows] = await Promise.all([
      loadRoster(),
      loadEvaluations(),
      loadSupportSanctions(),
    ]);
    const requiredEvaluations = roster.evaluators.length;

    const rowsBySupport = new Map<string, EvaluationRow[]>();
    const sanctionsBySupport = new Map<string, SupportSanctionRow[]>();

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

    const supports = roster.supports.map((support) => {
      const supportRows = rowsBySupport.get(support.id) ?? [];
      const supportSanctions = sanctionsBySupport.get(support.id) ?? [];
      const completed = supportRows.length;
      const totalScore = supportRows.reduce((sum, row) => sum + row.score, 0);
      const average = completed > 0 ? Number((totalScore / completed).toFixed(2)) : null;
      const allEvaluated = requiredEvaluations > 0 && completed >= requiredEvaluations;

      const evaluatorIds = new Set(supportRows.map((row) => row.evaluatorDiscordId));
      const pendingEvaluators = roster.evaluators
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
        averageScore: average,
        decision: allEvaluated
          ? (average ?? 0) >= 7
            ? "Pasa"
            : "No Pasa"
          : "Pendiente",
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
      };
    });

    return NextResponse.json({
      supports,
      evaluators: roster.evaluators,
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
