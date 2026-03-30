import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { sendDiscordComponentsV2Webhook, type ComponentsV2Input } from "@/lib/discord-webhook";
import { prisma } from "@/lib/prisma";

type PositivePointsRequestBody = {
  fecha?: string;
  supportOtorgado?: string;
  supportDiscordId?: string;
  supportPcuLink?: string;
  adminOtorga?: string;
  adminDiscordId?: string;
  justificacion?: string;
  pointCategory?: string;
  pointAction?: string;
  merits?: Array<{
    category: string;
    accion: string;
    puntos: number;
    descripcion: string;
  }>;
  categorias?: string[];
  evidencia?: string;
  totalPoints?: number;
  observaciones?: string;
};

function pointLevelLabel(points: number) {
  if (points <= 0.5) return "Normal";
  if (points <= 1) return "Intermedio";
  if (points <= 2) return "Alto";
  return "Excepcional";
}

function pointLevelColor(points: number): string {
  if (points <= 0.5) return "#fbbf24";
  if (points <= 1) return "#f97316";
  if (points <= 2) return "#10b981";
  return "#06b6d4";
}

function isAuthorizedByKey(request: Request) {
  const configuredKey = process.env.DISCORD_POSITIVE_POINTS_KEY ?? process.env.DISCORD_ANNOUNCE_KEY;
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

export async function POST(request: Request) {
  const webhookUrl =
    process.env.DISCORD_POSITIVE_POINTS_WEBHOOK_URL ??
    "https://discord.com/api/webhooks/1488242758341755012/niyr3mQD2F1P_nLuYP3ib74iy3WcMoc10QrBjnak2Is1YeLknibUBmFHJu2ntCuvPnBV";
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "DISCORD_POSITIVE_POINTS_WEBHOOK_URL is not configured" },
      { status: 500 }
    );
  }

  const authorized =
    isAuthorizedByKey(request) || (await isAuthorizedBySession());

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized to register positive points" },
      { status: 401 }
    );
  }

  let body: PositivePointsRequestBody;
  try {
    body = (await request.json()) as PositivePointsRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (
    !body.fecha ||
    !body.supportOtorgado ||
    !body.supportDiscordId ||
    !body.supportPcuLink ||
    !body.adminOtorga ||
    !body.justificacion ||
    !body.totalPoints
  ) {
    return NextResponse.json(
      {
        error:
          "fecha, supportOtorgado, supportDiscordId, supportPcuLink, adminOtorga, justificacion and totalPoints are required",
      },
      { status: 400 }
    );
  }

  const merits = Array.isArray(body.merits)
    ? body.merits.filter(
        (item): item is { category: string; accion: string; puntos: number; descripcion: string } =>
          Boolean(item?.category && item?.accion && item?.puntos)
      )
    : [];

  if (merits.length === 0) {
    return NextResponse.json(
      { error: "At least one merit is required" },
      { status: 400 }
    );
  }

  const totalPoints = body.totalPoints;
  const levelText = pointLevelLabel(totalPoints);
  const accentColor = pointLevelColor(totalPoints);

  const meritCategories = Array.from(
    new Set(merits.map((item) => item.category))
  ).join(" / ");

  const meritsSummary = merits.map((item) => `[${item.category}] ${item.accion} (+${item.puntos})`).join(" | ");

  const adminMention = asMention(body.adminDiscordId, body.adminOtorga);
  const supportMention = asMention(body.supportDiscordId, body.supportOtorgado);
  const mentionUserIds = [body.adminDiscordId, body.supportDiscordId].filter(
    (id): id is string => Boolean(id && /^\d{17,20}$/.test(id))
  );

  function buildPositivePointsPayload(opts: {
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
            `### Admin que otorga:`,
            `* Admin que otorga: ${adminMention} (${body.adminOtorga})`,
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "text",
          content: [
            `### Datos del Support:`,
            `* Support recompensado: ${supportMention} (${body.supportOtorgado})`,
            `* Link de PCU: ${body.supportPcuLink?.trim() || "-"}`,
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "text",
          content: [
            "**Justificación:**",
            body.justificacion,
          ].join("\n"),
        },
        {
          type: "text",
          content: [
            "**Méritos otorgados:**",
            ...merits.map((item, index) => `${index + 1}. [${item.category}] ${item.accion} (+${item.puntos})`),
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "fields",
          fields: [
            { name: "Méritos agregados", value: String(merits.length), inline: true },
            { name: "Puntos totales", value: String(totalPoints), inline: true },
            { name: "Categorías", value: meritCategories || "-", inline: true },
          ],
        },
        {
          type: "text",
          content: [
            "**Evidencia:**",
            body.evidencia?.trim() || "-",
          ].join("\n"),
        },
        { type: "separator", divider: true, spacing: 1 },
        {
          type: "fields",
          fields: [
            { name: "Puntos otorgados", value: `**${totalPoints}** (${levelText})`, inline: true },
          ],
        },
        {
          type: "text",
          content: "> Se recomienda verificar que no se trata de \"farmeo\" de puntos y que todos los méritos cumplen criterios de calidad.",
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
      staffPositivePoints?: {
        create: (args: {
          data: {
            supportDiscordId: string;
            supportName: string;
            supportPcuLink: string | null;
            adminDiscordId: string | null;
            adminName: string;
            fecha: string;
            pointType: string;
            pointValue: number;
            justificacion: string;
            evidencia: string | null;
            categorias: string[];
            observaciones: string | null;
          };
        }) => Promise<unknown>;
      };
    }).staffPositivePoints;

    if (delegate?.create) {
      await delegate.create({
        data: {
          supportDiscordId: body.supportDiscordId,
          supportName: body.supportOtorgado,
          supportPcuLink: body.supportPcuLink?.trim() || null,
          adminDiscordId: body.adminDiscordId?.trim() || null,
          adminName: body.adminOtorga,
          fecha: body.fecha,
          pointType: body.pointCategory || "General",
          pointValue: totalPoints,
          justificacion: body.justificacion,
          evidencia: body.evidencia?.trim() || null,
          categorias: body.categorias || [],
          observaciones: body.observaciones?.trim() || null,
        },
      });
    } else {
      await prisma.$executeRaw`
        INSERT INTO "StaffPositivePoints" (
          "supportDiscordId",
          "supportName",
          "supportPcuLink",
          "adminDiscordId",
          "adminName",
          "fecha",
          "pointType",
          "pointValue",
          "justificacion",
          "evidencia",
          "categorias",
          "observaciones",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${body.supportDiscordId},
          ${body.supportOtorgado},
          ${body.supportPcuLink?.trim() || null},
          ${body.adminDiscordId?.trim() || null},
          ${body.adminOtorga},
          ${body.fecha},
          ${body.pointCategory || "General"},
          ${totalPoints},
          ${body.justificacion},
          ${body.evidencia?.trim() || null},
          ${body.categorias || []},
          ${body.observaciones?.trim() || null},
          NOW(),
          NOW()
        )
      `;
    }

    const payload = buildPositivePointsPayload({
      title: "Puntos Positivos Otorgados",
      accentColor: accentColor,
      footer: "Support Management",
      contentAbove: mentionUserIds.length > 0
        ? mentionUserIds.map((id) => `<@${id}>`).join(" ")
        : undefined,
    });

    try {
      await sendDiscordComponentsV2Webhook(webhookUrl, payload);
    } catch (webhookError) {
      console.error("Discord webhook error:", webhookError);
    }

    return NextResponse.json({
      ok: true,
      totalPoints,
      levelText,
    });
  } catch (error) {
    console.error("Error registering positive points:", error);
    return NextResponse.json(
      { error: "Failed to register positive points" },
      { status: 500 }
    );
  }
}
