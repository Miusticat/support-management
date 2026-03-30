import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { sendDiscordComponentsV2Webhook, type ComponentsV2Input } from "@/lib/discord-webhook";
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
  criticalCase?: boolean;
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

function sanctionAccentHex(sanction: string): string {
  switch (sanction) {
    case "Advertencia":
      return "#FBBF24";
    case "Warn Intermedio":
      return "#F97316";
    case "Warn Grave":
      return "#EF4444";
    case "Suspension":
      return "#DC2626";
    case "Remocion":
      return "#991B1B";
    default:
      return "#FF6B84";
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

function resolveFinalSanction(baseSanction: string, counts: SanctionCounts, criticalCase = false) {
  const totalIntermedios = counts.warnIntermedios + (baseSanction === "Warn Intermedio" ? 1 : 0);

  if (criticalCase && baseSanction === "Warn Grave") {
    return {
      finalSanction: "Remocion",
      note: "Warn Grave en falta critica: se aplica Remocion directa por gravedad.",
    };
  }

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

  if (baseSanction === "Advertencia" && counts.advertencias >= 1) {
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

  if (baseSanction === "Warn Intermedio") {
    return {
      finalSanction: baseSanction,
      note: "Warn Intermedio aplicado: corresponde seguimiento del desempeño.",
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
    !body.supportPcuLink ||
    !body.adminSanciona ||
    !body.motivo ||
    !body.sancion
  ) {
    return NextResponse.json(
      {
        error:
          "fecha, supportSancionado, supportDiscordId, supportPcuLink, adminSanciona, motivo and sancion are required",
      },
      { status: 400 }
    );
  }

  const counts = await getSupportCounts(body.supportDiscordId);
  const baseSancion = body.sancion;
  const resolution = resolveFinalSanction(baseSancion, counts, Boolean(body.criticalCase));
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

  const mentionsContent = mentionUserIds.length > 0
    ? mentionUserIds.map((id) => `<@${id}>`).join(" ")
    : undefined;

  function buildSanctionPayload(opts: {
    title: string;
    accentColor: string;
    footer: string;
    contentAbove?: string;
  }): ComponentsV2Input {
    return {
      accentColorHex: opts.accentColor,
      title: opts.title,
      contentAbove: opts.contentAbove,
      footerText: opts.footer,
      mentionUserIds,
      blocks: [
        {
          type: "text",
          content: [
            `### Fecha:\n${body.fecha}`,
            `### Admin que sanciona:`,
            `* Trainer/Admin que sanciona: ${adminMention} (${body.adminSanciona})`,
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "text",
          content: [
            `### Datos del Support:`,
            `* Support Sancionado: ${supportMention} (${body.supportSancionado})`,
            `* Link de PCU: ${body.supportPcuLink?.trim() || "-"}`,
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "text",
          content: [
            "**Motivo:**",
            body.motivo,
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "fields",
          fields: [
            { name: "Bloque evaluaci\u00f3n", value: body.policyCategory?.trim() || "-", inline: true },
            { name: "Falta", value: body.policyFault?.trim() || "-", inline: true },
            { name: "Categor\u00edas", value: categorias, inline: true },
          ],
        },
        {
          type: "text",
          content: [
            "**Pruebas:**",
            body.pruebas?.trim() || "-",
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "fields",
          fields: [
            { name: "Sanci\u00f3n solicitada", value: `${baseSancion} (${sanctionLevelLabel(baseSancion)})`, inline: true },
            { name: "Sanci\u00f3n final aplicada", value: `**${finalSanction}** (${finalLevel})`, inline: true },
            { name: "Caso critico", value: body.criticalCase ? "Si" : "No", inline: true },
          ],
        },
        {
          type: "fields",
          fields: [
            { name: "Advertencias previas", value: String(counts.advertencias), inline: true },
            { name: "Warn Intermedios previos", value: String(counts.warnIntermedios), inline: true },
            { name: "Warn Graves previos", value: String(counts.warnGraves), inline: true },
          ],
        },
        {
          type: "text",
          content: `> ${resolution.note}`,
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "text",
          content: [
            "**Observaciones:**",
            body.observaciones?.trim() || "-",
          ].join("\n"),
        },
      ],
    };
  }

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
          requestedSanction: baseSancion,
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
          ${baseSancion},
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

    await sendDiscordComponentsV2Webhook(
      webhookUrl,
      buildSanctionPayload({
        title: "Registro de sanción",
        accentColor: sanctionAccentHex(finalSanction),
        footer: "Support Management | Registro interno",
        contentAbove: mentionsContent,
      })
    );

    if (historyWebhookUrl) {
      await sendDiscordComponentsV2Webhook(
        historyWebhookUrl,
        buildSanctionPayload({
          title: "Historial | Registro de sanción",
          accentColor: sanctionAccentHex(finalSanction),
          footer: "Support Management | Historial",
          contentAbove: mentionsContent
            ? `Historial actualizado: ${mentionsContent}`
            : "Historial actualizado",
        })
      );
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

export async function DELETE(request: Request) {
  const authorized = await isAuthorizedBySession();
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized to delete sanctions" },
      { status: 401 }
    );
  }

  let body: { id: string };
  try {
    body = (await request.json()) as { id: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  try {
    const delegate = (prisma as unknown as {
      staffSanction?: {
        delete: (args: {
          where: { id: string };
        }) => Promise<unknown>;
      };
    }).staffSanction;

    if (delegate?.delete) {
      await delegate.delete({
        where: { id: body.id },
      });
    } else {
      await prisma.$executeRaw`
        DELETE FROM "StaffSanction"
        WHERE "id" = ${body.id}
      `;
    }

    return NextResponse.json({
      ok: true,
      message: "Sanción eliminada correctamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const authorized = await isAuthorizedBySession();
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized to update sanctions" },
      { status: 401 }
    );
  }

  let body: {
    id: string;
    supportName?: string;
    supportDiscordId?: string;
    adminName?: string;
    requestedSanction?: string;
    appliedSanction?: string;
    accumulationNote?: string;
    fecha?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (body.supportName !== undefined) updateData.supportName = body.supportName;
    if (body.supportDiscordId !== undefined) updateData.supportDiscordId = body.supportDiscordId;
    if (body.adminName !== undefined) updateData.adminName = body.adminName;
    if (body.requestedSanction !== undefined) updateData.requestedSanction = body.requestedSanction;
    if (body.appliedSanction !== undefined) updateData.appliedSanction = body.appliedSanction;
    if (body.accumulationNote !== undefined) updateData.accumulationNote = body.accumulationNote;
    if (body.fecha !== undefined) updateData.fecha = body.fecha;

    const delegate = (prisma as unknown as {
      staffSanction?: {
        update: (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => Promise<unknown>;
      };
    }).staffSanction;

    if (delegate?.update) {
      await delegate.update({
        where: { id: body.id },
        data: updateData,
      });
    } else {
      const setClause = Object.entries(updateData)
        .map(([key, value]) => `"${key}" = ${
          typeof value === "string" ? `'${value.replace(/'/g, "''")}'` : value
        }`)
        .join(", ");

      if (setClause) {
        await prisma.$executeRaw`
          UPDATE "StaffSanction"
          SET ${setClause}
          WHERE "id" = ${body.id}
        `;
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Sanción actualizada correctamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
