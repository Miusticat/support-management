import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessSanctionsByRole } from "@/lib/discord-staff-roles";

const DEFAULT_SHEET_ID = "1VSKN3G7PtWbagnmI9RoOIKFXmZFAGGe6B8Dh-0E5Z9A";
const DEFAULT_SHEET_GID = "0";

type GoogleVizColumn = {
  label?: string;
};

type GoogleVizCell = {
  v?: unknown;
  f?: string;
};

type GoogleVizRow = {
  c?: Array<GoogleVizCell | null>;
};

type GoogleVizResponse = {
  table?: {
    cols?: GoogleVizColumn[];
    rows?: GoogleVizRow[];
  };
};

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
  if (!cell) {
    return "";
  }

  if (typeof cell.f === "string" && cell.f.trim().length > 0) {
    return cell.f;
  }

  if (typeof cell.v === "string") {
    return cell.v;
  }

  if (typeof cell.v === "number" || typeof cell.v === "boolean") {
    return String(cell.v);
  }

  if (cell.v === null || cell.v === undefined) {
    return "";
  }

  return String(cell.v);
}

function isRowMeaningful(row: string[]) {
  return row.some((value) => value.trim().length > 0);
}

function extractSheetSourceFromUrl(value: string) {
  const input = value.trim();
  if (!input) {
    return null;
  }

  try {
    const parsedUrl = new URL(input);
    const pathMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([^/]+)/i);
    const sheetId = pathMatch?.[1]?.trim() ?? "";

    const gidFromQuery = parsedUrl.searchParams.get("gid")?.trim() ?? "";
    const gidFromHashMatch = parsedUrl.hash.match(/gid=(\d+)/i);
    const gidFromHash = gidFromHashMatch?.[1]?.trim() ?? "";

    return {
      sheetId,
      gid: gidFromQuery || gidFromHash || "",
    };
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

  return {
    sheetId,
    gid,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!canAccessSanctionsByRole(session?.user?.staffRole ?? null)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

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
      {
        method: "GET",
        cache: "no-store",
      }
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

    const cols = Array.isArray(parsed.table?.cols) ? parsed.table?.cols : [];
    const rows = Array.isArray(parsed.table?.rows) ? parsed.table?.rows : [];

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

    return NextResponse.json(
      {
        headers,
        rows: normalizedRows,
        source: {
          sheetId,
          gid: sheetGid,
        },
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        error: "No se pudieron cargar las postulaciones",
        details: message,
      },
      { status: 500 }
    );
  }
}
