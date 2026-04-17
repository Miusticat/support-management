import { NextResponse } from "next/server";

type ParsedMetric = {
  key: string;
  label: string;
  value: number | null;
};

type MetricCandidate = {
  key: string;
  label: string;
  patterns: RegExp[];
};

const SOURCE_URL = "https://pcu-es.gta.world/tester/manager";
const REQUEST_TIMEOUT_MS = 12_000;

const METRIC_CANDIDATES: MetricCandidate[] = [
  {
    key: "pending",
    label: "Pendientes",
    patterns: [
      /Pendientes?\D{0,20}(\d+)/i,
      /Pending\D{0,20}(\d+)/i,
    ],
  },
  {
    key: "approved",
    label: "Aprobados",
    patterns: [
      /Aprobados?\D{0,20}(\d+)/i,
      /Approved\D{0,20}(\d+)/i,
    ],
  },
  {
    key: "rejected",
    label: "Rechazados",
    patterns: [
      /Rechazados?\D{0,20}(\d+)/i,
      /Rejected\D{0,20}(\d+)/i,
    ],
  },
  {
    key: "inReview",
    label: "En revision",
    patterns: [
      /En\s+revision\D{0,20}(\d+)/i,
      /In\s+Review\D{0,20}(\d+)/i,
      /Reviewing\D{0,20}(\d+)/i,
    ],
  },
  {
    key: "total",
    label: "Total",
    patterns: [
      /Total\D{0,20}(\d+)/i,
      /Total\s+applications\D{0,20}(\d+)/i,
    ],
  },
];

function sanitizeHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function detectAntiBot(html: string) {
  const lowered = html.toLowerCase();
  return (
    lowered.includes("please turn javascript on and reload the page") ||
    lowered.includes("slowaes.decrypt") ||
    lowered.includes("ectrixnet-w8")
  );
}

function extractValue(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseMetrics(html: string): ParsedMetric[] {
  const text = sanitizeHtmlToText(html);

  return METRIC_CANDIDATES.map((metric) => ({
    key: metric.key,
    label: metric.label,
    value: extractValue(text, metric.patterns),
  }));
}

export async function GET() {
  const cookieFromEnv = process.env.PCU_TESTER_MANAGER_COOKIE?.trim();
  const userAgent =
    process.env.PCU_TESTER_MANAGER_USER_AGENT?.trim() ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };

  if (cookieFromEnv) {
    headers.Cookie = cookieFromEnv;
  }

  try {
    const response = await fetch(SOURCE_URL, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const html = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          available: false,
          sourceUrl: SOURCE_URL,
          fetchedAt: new Date().toISOString(),
          metrics: [] as ParsedMetric[],
          note: `Fuente no disponible (HTTP ${response.status}).`,
        },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    if (detectAntiBot(html)) {
      return NextResponse.json(
        {
          available: false,
          sourceUrl: SOURCE_URL,
          fetchedAt: new Date().toISOString(),
          metrics: [] as ParsedMetric[],
          note:
            "La fuente requiere JavaScript/sesion para entregar datos. Configura PCU_TESTER_MANAGER_COOKIE para habilitar lectura automatica.",
        },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const metrics = parseMetrics(html);
    const hasAnyValue = metrics.some((metric) => metric.value !== null);

    return NextResponse.json(
      {
        available: hasAnyValue,
        sourceUrl: SOURCE_URL,
        fetchedAt: new Date().toISOString(),
        metrics,
        note: hasAnyValue
          ? null
          : "No se pudieron reconocer metricas en el HTML recibido.",
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        available: false,
        sourceUrl: SOURCE_URL,
        fetchedAt: new Date().toISOString(),
        metrics: [] as ParsedMetric[],
        note: `Error al consultar fuente externa: ${details}`,
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
