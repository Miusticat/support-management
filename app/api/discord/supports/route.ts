import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DiscordGuildMember = {
  roles?: string[];
  user?: {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
  nick?: string | null;
};

type TeamRole = "Support Lead" | "Support Trainer" | "Support";

type SupportSummary = {
  id: string;
  displayName: string;
  username: string;
  role: TeamRole;
  roleLevel: number;
  sanctions: {
    total: number;
    advertencia: number;
    warnIntermedio: number;
    warnGrave: number;
    suspension: number;
    remocion: number;
  };
  status: {
    label: string;
    severity: "clean" | "low" | "medium" | "high" | "critical";
    score: number;
  };
  manualStatus: {
    value: "Activo" | "Expulsado" | "Renuncio" | "Reincorporado";
    updatedByName: string | null;
    updatedAt: string | null;
  };
};

type LifecycleRow = {
  supportDiscordId: string;
  manualStatus: "Activo" | "Expulsado" | "Renuncio" | "Reincorporado";
  updatedByName: string | null;
  updatedAt: Date;
};

type LifecycleRequestBody = {
  supportDiscordId?: string;
  manualStatus?: "Activo" | "Expulsado" | "Renuncio" | "Reincorporado";
};

const MANUAL_STATUS_OPTIONS = ["Activo", "Expulsado", "Renuncio", "Reincorporado"] as const;

function normalizeRoleId(value: string | undefined, fallback: string) {
  return (value ?? fallback).trim().replace(/^"|"$/g, "") || fallback;
}

const ROLE_SUPPORT_LEAD_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_LEAD_ID,
  "1486041732238803096"
);
const ROLE_SUPPORT_TRAINER_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_TRAINER_ID,
  "1486041733405081712"
);
const ROLE_SUPPORT_ID = normalizeRoleId(
  process.env.DISCORD_ROLE_SUPPORT_ID,
  "1486041737964290211"
);

function getRoleFromIds(roleIds: string[]): { role: TeamRole | null; roleLevel: number } {
  if (roleIds.includes(ROLE_SUPPORT_LEAD_ID)) {
    return { role: "Support Lead", roleLevel: 3 };
  }

  if (roleIds.includes(ROLE_SUPPORT_TRAINER_ID)) {
    return { role: "Support Trainer", roleLevel: 2 };
  }

  if (roleIds.includes(ROLE_SUPPORT_ID)) {
    return { role: "Support", roleLevel: 1 };
  }

  return { role: null, roleLevel: 0 };
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

function emptySanctions() {
  return {
    total: 0,
    advertencia: 0,
    warnIntermedio: 0,
    warnGrave: 0,
    suspension: 0,
    remocion: 0,
  };
}

function resolveStatus(sanctions: ReturnType<typeof emptySanctions>) {
  if (sanctions.total === 0) {
    return { label: "Historial limpio", severity: "clean" as const, score: 0 };
  }

  if (sanctions.remocion > 0) {
    return { label: "Crítico", severity: "critical" as const, score: 4 };
  }

  if (sanctions.suspension > 0 || sanctions.warnGrave >= 2) {
    return { label: "Alto", severity: "high" as const, score: 3 };
  }

  if (sanctions.warnGrave > 0 || sanctions.warnIntermedio >= 2) {
    return { label: "Medio", severity: "medium" as const, score: 2 };
  }

  return { label: "Bajo", severity: "low" as const, score: 1 };
}

async function loadSanctionsFromDb() {
  const delegate = (prisma as unknown as {
    staffSanction?: {
      findMany: (args: {
        select: {
          supportDiscordId: true;
          appliedSanction: true;
        };
      }) => Promise<Array<{ supportDiscordId: string; appliedSanction: string }>>;
    };
  }).staffSanction;

  if (delegate?.findMany) {
    return delegate.findMany({
      select: {
        supportDiscordId: true,
        appliedSanction: true,
      },
    });
  }

  return prisma.$queryRaw<Array<{ supportDiscordId: string; appliedSanction: string }>>`
    SELECT "supportDiscordId", "appliedSanction"
    FROM "StaffSanction"
  `;
}

async function ensureLifecycleTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SupportLifecycleState" (
      "supportDiscordId" TEXT PRIMARY KEY,
      "manualStatus" TEXT NOT NULL DEFAULT 'Activo',
      "updatedByName" TEXT,
      "updatedByDiscordId" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function loadLifecycleState() {
  await ensureLifecycleTable();

  return prisma.$queryRaw<LifecycleRow[]>`
    SELECT
      "supportDiscordId",
      "manualStatus",
      "updatedByName",
      "updatedAt"
    FROM "SupportLifecycleState"
  `;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.staffLevel ?? 0) < 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId) {
    return NextResponse.json(
      { error: "DISCORD_GUILD_ID is not configured" },
      { status: 500 }
    );
  }

  if (!botToken) {
    return NextResponse.json(
      { error: "DISCORD_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    const [members, sanctionRows, lifecycleRows] = await Promise.all([
      fetchGuildMembers(guildId, botToken),
      loadSanctionsFromDb(),
      loadLifecycleState(),
    ]);

    const sanctionsBySupport = new Map<string, ReturnType<typeof emptySanctions>>();
    const lifecycleBySupport = new Map<string, LifecycleRow>();

    for (const lifecycle of lifecycleRows) {
      if (!lifecycle.supportDiscordId?.trim()) {
        continue;
      }

      lifecycleBySupport.set(lifecycle.supportDiscordId, lifecycle);
    }

    // Auto-create lifecycle records for new supports with "Activo" status
    const existingSupportIds = new Set(lifecycleBySupport.keys());
    const newSupportIds = members
      .filter(
        (member) =>
          member.user?.id?.trim() &&
          !existingSupportIds.has(member.user.id.trim())
      )
      .map((member) => member.user!.id!.trim());

    if (newSupportIds.length > 0) {
      await ensureLifecycleTable();
      for (const supportId of newSupportIds) {
        await prisma.$executeRaw`
          INSERT INTO "SupportLifecycleState" (
            "supportDiscordId",
            "manualStatus",
            "updatedAt"
          ) VALUES (
            ${supportId},
            'Activo',
            NOW()
          )
          ON CONFLICT ("supportDiscordId") DO NOTHING
        `;
      }
    }

    for (const row of sanctionRows) {
      const supportId = row.supportDiscordId?.trim();
      if (!supportId) {
        continue;
      }

      const current = sanctionsBySupport.get(supportId) ?? emptySanctions();
      current.total += 1;

      if (row.appliedSanction === "Advertencia") current.advertencia += 1;
      if (row.appliedSanction === "Warn Intermedio") current.warnIntermedio += 1;
      if (row.appliedSanction === "Warn Grave") current.warnGrave += 1;
      if (row.appliedSanction === "Suspension") current.suspension += 1;
      if (row.appliedSanction === "Remocion") current.remocion += 1;

      sanctionsBySupport.set(supportId, current);
    }

    const supports: SupportSummary[] = members
      .map((member) => {
        const id = member.user?.id?.trim() ?? "";
        const username = member.user?.username?.trim() ?? "";
        const displayName =
          member.nick?.trim() ||
          member.user?.global_name?.trim() ||
          username ||
          id;

        const roleIds = Array.isArray(member.roles) ? member.roles : [];
        const roleInfo = getRoleFromIds(roleIds);

        if (!id || !roleInfo.role) {
          return null;
        }

        const sanctions = sanctionsBySupport.get(id) ?? emptySanctions();
        const status = resolveStatus(sanctions);
        const lifecycle = lifecycleBySupport.get(id);
        const manualStatus =
          lifecycle && MANUAL_STATUS_OPTIONS.includes(lifecycle.manualStatus)
            ? lifecycle.manualStatus
            : "Activo";

        return {
          id,
          displayName,
          username,
          role: roleInfo.role,
          roleLevel: roleInfo.roleLevel,
          sanctions,
          status,
          manualStatus: {
            value: manualStatus,
            updatedByName: lifecycle?.updatedByName ?? null,
            updatedAt: lifecycle?.updatedAt?.toISOString() ?? null,
          },
        };
      })
      .filter((member): member is SupportSummary => Boolean(member))
      .sort((a, b) => {
        if (b.roleLevel !== a.roleLevel) {
          return b.roleLevel - a.roleLevel;
        }

        if (b.status.score !== a.status.score) {
          return b.status.score - a.status.score;
        }

        if (b.sanctions.total !== a.sanctions.total) {
          return b.sanctions.total - a.sanctions.total;
        }

        return a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" });
      });

    return NextResponse.json({
      supports,
      totals: {
        all: supports.length,
        clean: supports.filter((item) => item.status.severity === "clean").length,
        highRisk: supports.filter((item) => ["high", "critical"].includes(item.status.severity)).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const currentRole = session?.user?.staffRole ?? null;
  const canManage = currentRole === "Support Lead" || currentRole === "Support Trainer";

  if (!session?.user?.id || !canManage) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: LifecycleRequestBody;
  try {
    body = (await request.json()) as LifecycleRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const supportDiscordId = body.supportDiscordId?.trim() ?? "";
  const manualStatus = body.manualStatus;

  if (!/^\d{17,20}$/.test(supportDiscordId)) {
    return NextResponse.json({ error: "supportDiscordId invalido" }, { status: 400 });
  }

  if (!manualStatus || !MANUAL_STATUS_OPTIONS.includes(manualStatus)) {
    return NextResponse.json({ error: "manualStatus invalido" }, { status: 400 });
  }

  try {
    await ensureLifecycleTable();

    await prisma.$executeRaw`
      INSERT INTO "SupportLifecycleState" (
        "supportDiscordId",
        "manualStatus",
        "updatedByName",
        "updatedByDiscordId",
        "updatedAt"
      ) VALUES (
        ${supportDiscordId},
        ${manualStatus},
        ${session.user.name ?? "-"},
        ${session.user.discordUserId ?? null},
        NOW()
      )
      ON CONFLICT ("supportDiscordId")
      DO UPDATE SET
        "manualStatus" = EXCLUDED."manualStatus",
        "updatedByName" = EXCLUDED."updatedByName",
        "updatedByDiscordId" = EXCLUDED."updatedByDiscordId",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
