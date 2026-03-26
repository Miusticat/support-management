import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { sendDiscordAnnouncementWebhook } from "@/lib/discord-webhook";
import { prisma } from "@/lib/prisma";

type SanctionRequestBody = {
  fecha?: string;
  supportSancionado?: string;
  supportDiscordId?: string;
  supportPcuLink?: string;
  adminSanciona?: string;
  adminDiscordId?: string;
  motivo?: string;
  policyCategory?: string;
  policyFault?: string;
  categorias?: string[];
  pruebas?: string;
  sancion?: string;
  observaciones?: string;
};

type SanctionCounts = {
  advertencias: number;
  warnIntermedios: number;
  warnGraves: number;
};

function isAuthorizedByKey(request: Request) {
  const configuredKey =
    process.env.DISCORD_SANCTIONS_KEY ?? process.env.DISCORD_ANNOUNCE_KEY;
  if (!configuredKey) {
    return false;
  }

  const requestKey = request.headers.get("x-announce-key") ?? "";
  return requestKey.length > 0 && requestKey === configuredKey;
}

async function isAuthorizedBySession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return false;
  }

  const hasAllowedRole = canAccessSanctionsByRole(session.user.staffRole ?? null);
  if (!hasAllowedRole) {
    return false;
  }

  const requiredGuildId = process.env.DISCORD_GUILD_ID;
  if (!requiredGuildId) {
    return true;
  }

  // Some existing sessions may not carry discordGuildId yet. If role is valid,
  // do not block sanctions flow while token claims catch up.
  if (!session.user.discordGuildId) {
    return true;
  }

  return session.user.discordGuildId === requiredGuildId;
}

function markdownBlock(label: string, value: string) {
  return `### ${label}:\n${value.trim() || "-"}`;
}

function asMention(discordId?: string, fallbackName?: string) {
  if (discordId && /^\d{17,20}$/.test(discordId)) {
    return `<@${discordId}>`;
  }

  return fallbackName?.trim() || "-";
}

function sanctionLevelLabel(sanction: string) {
  switch (sanction) {
    case "Advertencia":
      return "Nivel 1";
    case "Warn Intermedio":
      return "Nivel 2";
    case "Warn Grave":
      return "Nivel 3";
    case "Suspension":
      return "Nivel 4";
    case "Remocion":
      return "Nivel 5";
    default:
      return "Nivel -";
  }
}

function getAccumulationCounts(sanctions: { appliedSanction: string }[]): SanctionCounts {
  const counts: SanctionCounts = {
    advertencias: 0,
    warnIntermedios: 0,
    warnGraves: 0,
  };

  for (const sanction of sanctions) {
    if (sanction.appliedSanction === "Advertencia") {
      counts.advertencias += 1;
    }

    if (sanction.appliedSanction === "Warn Intermedio") {
      counts.warnIntermedios += 1;
    }

    if (sanction.appliedSanction === "Warn Grave") {
      counts.warnGraves += 1;
    }
  }

  return counts;
}

function resolveFinalSanction(baseSanction: string, counts: SanctionCounts) {
  const totalIntermedios = counts.warnIntermedios + (baseSanction === "Warn Intermedio" ? 1 : 0);

  if (totalIntermedios >= 3) {
    return {
      finalSanction: "Remocion",
      note: "Acumulacion de 3 Warn Intermedios: corresponde Remocion del staff.",
    };
  }

  if (baseSanction === "Warn Grave" && (counts.warnIntermedios > 0 || counts.warnGraves > 0)) {
    return {
      finalSanction: "Suspension",
      note: "Warn Grave con antecedentes: se eleva automaticamente a Suspension.",
    };
  }

  if (baseSanction === "Advertencia" && counts.advertencias >= 2) {
    return {
      finalSanction: "Warn Intermedio",
      note: "Acumulacion de advertencias: se eleva automaticamente a Warn Intermedio.",
    };
  }

  if (totalIntermedios >= 2) {
    return {
      finalSanction: baseSanction,
      note: "Acumulacion de 2 Warn Intermedios: corresponde evaluacion inmediata del puesto.",
    };
  }

  return {
    finalSanction: baseSanction,
    note: "Sin escalamiento automatico por acumulacion en este registro.",
  };
}

async function getSupportCounts(supportDiscordId: string) {
  const delegate = (prisma as unknown as {
    staffSanction?: {
      findMany: (args: {
        where: { supportDiscordId: string };
        select: { appliedSanction: true };
      }) => Promise<Array<{ appliedSanction: string }>>;
    };
  }).staffSanction;

  const sanctions = delegate?.findMany
    ? await delegate.findMany({
        where: {
          supportDiscordId,
        },
        select: {
          appliedSanction: true,
        },
      })
    : await prisma.$queryRaw<Array<{ appliedSanction: string }>>`
        SELECT "appliedSanction"
        FROM "StaffSanction"
        WHERE "supportDiscordId" = ${supportDiscordId}
      `;

  return getAccumulationCounts(sanctions);
}

export async function GET(request: Request) {
  const authorized = await isAuthorizedBySession();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const supportDiscordId = searchParams.get("supportDiscordId")?.trim() ?? "";

  if (!/^\d{17,20}$/.test(supportDiscordId)) {
    return NextResponse.json({
      counts: {
        advertencias: 0,
        warnIntermedios: 0,
        warnGraves: 0,
      },
      suggestedSanction: null,
      accumulationNote: "Selecciona un Support para calcular antecedentes.",
    });
  }

  const counts = await getSupportCounts(supportDiscordId);
  const suggestion = resolveFinalSanction("Advertencia", counts);

  return NextResponse.json({
    counts,
    suggestedSanction: suggestion.finalSanction,
    accumulationNote: suggestion.note,
  });
}

export async function POST(request: Request) {
  const webhookUrl = process.env.DISCORD_SANCTIONS_WEBHOOK_URL;
  const historyWebhookUrl = process.env.DISCORD_SANCTIONS_HISTORY_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "DISCORD_SANCTIONS_WEBHOOK_URL is not configured" },
      { status: 500 }
    );
  }

  const authorized =
    isAuthorizedByKey(request) || (await isAuthorizedBySession());

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized to register sanctions" },
      { status: 401 }
    );
  }

  let body: SanctionRequestBody;
  try {
    body = (await request.json()) as SanctionRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (
    !body.fecha ||
    !body.supportSancionado ||
    !body.supportDiscordId ||
    !body.adminSanciona ||
    !body.motivo ||
    !body.sancion
  ) {
    return NextResponse.json(
      {
        error:
          "fecha, supportSancionado, supportDiscordId, adminSanciona, motivo and sancion are required",
      },
      { status: 400 }
    );
  }

  const counts = await getSupportCounts(body.supportDiscordId);
  const resolution = resolveFinalSanction(body.sancion, counts);
  const finalSanction = resolution.finalSanction;
  const finalLevel = sanctionLevelLabel(finalSanction);

  const categorias =
    body.categorias && body.categorias.length > 0
      ? body.categorias.join(" / ")
      : "-";

  const adminMention = asMention(body.adminDiscordId, body.adminSanciona);
  const supportMention = asMention(body.supportDiscordId, body.supportSancionado);
  const mentionUserIds = [body.adminDiscordId, body.supportDiscordId].filter(
    (id): id is string => Boolean(id && /^\d{17,20}$/.test(id))
  );

  const description = [
    markdownBlock("Fecha", body.fecha),
    "### Datos del Admin que sanciona:",
    `* Trainer/Admin que sanciona: ${adminMention} (${body.adminSanciona})`,
    "### Datos del Support:",
    `* Support Sancionado: ${supportMention} (${body.supportSancionado})`,
    `* Link de PCU: ${body.supportPcuLink?.trim() || "-"}`,
    "",
    "**Motivo:**",
    body.motivo,
    "",
    "**Tabla de evaluacion:**",
    `Bloque: ${body.policyCategory?.trim() || "-"}`,
    `Falta: ${body.policyFault?.trim() || "-"}`,
    "",
    "**Categoria (Puede elegir una o varias segun aplique):**",
    categorias,
    "",
    "**Pruebas:**",
    body.pruebas?.trim() || "-",
    "",
    "**Sancion solicitada:**",
    `${body.sancion} (${sanctionLevelLabel(body.sancion)})`,
    "",
    "**Sancion final aplicada:**",
    `${finalSanction} (${finalLevel})`,
    "",
    "**Acumulacion:**",
    `Advertencias previas: ${counts.advertencias}`,
    `Warn Intermedios previos: ${counts.warnIntermedios}`,
    `Warn Graves previos: ${counts.warnGraves}`,
    resolution.note,
    "",
    "**Observaciones:**",
    body.observaciones?.trim() || "-",
  ].join("\n");

  try {
    const delegate = (prisma as unknown as {
      staffSanction?: {
        create: (args: {
          data: {
            supportDiscordId: string;
            supportName: string;
            supportPcuLink: string | null;
            adminDiscordId: string | null;
            adminName: string;
            fecha: string;
            policyCategory: string | null;
            policyFault: string | null;
            motivo: string;
            categorias: string[];
            pruebas: string | null;
            requestedSanction: string;
            appliedSanction: string;
            levelLabel: string;
            previousAdvertencias: number;
            previousWarnIntermedios: number;
            previousWarnGraves: number;
            accumulationNote: string;
            observaciones: string | null;
          };
        }) => Promise<unknown>;
      };
    }).staffSanction;

    if (delegate?.create) {
      await delegate.create({
        data: {
          supportDiscordId: body.supportDiscordId,
          supportName: body.supportSancionado,
          supportPcuLink: body.supportPcuLink?.trim() || null,
          adminDiscordId: body.adminDiscordId?.trim() || null,
          adminName: body.adminSanciona,
          fecha: body.fecha,
          policyCategory: body.policyCategory?.trim() || null,
          policyFault: body.policyFault?.trim() || null,
          motivo: body.motivo,
          categorias: body.categorias ?? [],
          pruebas: body.pruebas?.trim() || null,
          requestedSanction: body.sancion,
          appliedSanction: finalSanction,
          levelLabel: finalLevel,
          previousAdvertencias: counts.advertencias,
          previousWarnIntermedios: counts.warnIntermedios,
          previousWarnGraves: counts.warnGraves,
          accumulationNote: resolution.note,
          observaciones: body.observaciones?.trim() || null,
        },
      });
    } else {
      await prisma.$executeRaw`
        INSERT INTO "StaffSanction" (
          "supportDiscordId",
          "supportName",
          "supportPcuLink",
          "adminDiscordId",
          "adminName",
          "fecha",
          "policyCategory",
          "policyFault",
          "motivo",
          "categorias",
          "pruebas",
          "requestedSanction",
          "appliedSanction",
          "levelLabel",
          "previousAdvertencias",
          "previousWarnIntermedios",
          "previousWarnGraves",
          "accumulationNote",
          "observaciones"
        ) VALUES (
          ${body.supportDiscordId},
          ${body.supportSancionado},
          ${body.supportPcuLink?.trim() || null},
          ${body.adminDiscordId?.trim() || null},
          ${body.adminSanciona},
          ${body.fecha},
          ${body.policyCategory?.trim() || null},
          ${body.policyFault?.trim() || null},
          ${body.motivo},
          ${body.categorias ?? []},
          ${body.pruebas?.trim() || null},
          ${body.sancion},
          ${finalSanction},
          ${finalLevel},
          ${counts.advertencias},
          ${counts.warnIntermedios},
          ${counts.warnGraves},
          ${resolution.note},
          ${body.observaciones?.trim() || null}
        )
      `;
    }

    await sendDiscordAnnouncementWebhook(webhookUrl, {
      title: "Registro de Sancion",
      description,
      colorHex: "#FF6B84",
      footerText: "Support Management | Registro Interno",
      content:
        mentionUserIds.length > 0
          ? `Mencionados: ${mentionUserIds.map((id) => `<@${id}>`).join(" ")}`
          : "",
      mentionUserIds,
    });

    if (historyWebhookUrl) {
      await sendDiscordAnnouncementWebhook(historyWebhookUrl, {
        title: "Historial | Registro de Sancion",
        description,
        colorHex: "#F59E0B",
        footerText: "Support Management | Historial",
        content:
          mentionUserIds.length > 0
            ? `Historial actualizado: ${mentionUserIds.map((id) => `<@${id}>`).join(" ")}`
            : "Historial actualizado",
        mentionUserIds,
      });
    }

    return NextResponse.json({
      ok: true,
      finalSanction,
      finalLevel,
      counts,
      accumulationNote: resolution.note,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
