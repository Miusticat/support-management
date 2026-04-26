import { getSql } from "./index";
import { ensureDbInitialized } from "./schema";
import type {
  TicketRecord,
  ImportResult,
  OverviewStats,
  HourlyBucket,
  HandlerStat,
  VolumeBucket,
  KeywordStat,
  TicketRow,
  DayOfWeekBucket,
  TopUser,
  HandlerHourly,
  PeriodComparison,
  AdvancedStats,
} from "../types";

// ─── Support Members ───────────────────────────────────────

export async function getActiveSupportMembers(): Promise<string[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const rows = await sql`
    SELECT name FROM support_members WHERE is_active = true ORDER BY name
  ` as { name: string }[];

  return rows.map(row => row.name);
}

export async function isSupportMember(handler: string): Promise<boolean> {
  const supportMembers = await getActiveSupportMembers();
  return supportMembers.includes(handler);
}

// ─── Import ──────────────────────────────────────────────

export async function insertTickets(
  tickets: TicketRecord[],
  importedBy?: number
): Promise<ImportResult> {
  await ensureDbInitialized();
  const sql = getSql();

  // Check which tickets already exist before inserting
  const ids = tickets.map((t) => t.id);
  const existing = (await sql`
    SELECT id FROM tickets WHERE id = ANY(${ids})
  `) as { id: number }[];
  const existingIds = new Set(existing.map(e => e.id));
  
  // Filter out existing tickets
  const newTickets = tickets.filter(t => !existingIds.has(t.id));
  const duplicateCount = tickets.length - newTickets.length;

  // Insert only new tickets
  let inserted = 0;
  for (const t of newTickets) {
    const result = (await sql`
      INSERT INTO tickets (id, username, character, request, submitted_at, handler, imported_by, category_id)
      VALUES (${t.id}, ${t.username}, ${t.character}, ${t.request}, ${t.submittedAt}::timestamptz, ${t.handler}, ${importedBy ?? null}, ${t.categoryId ?? null})
    `) as unknown[];
    // neon returns the rows affected info
    if (result && (result as Record<string, unknown>[]).length !== undefined) {
      inserted++;
    }
  }

  return {
    inserted: inserted,
    duplicates: duplicateCount,
    total: tickets.length,
  };
}

export async function updateTicketCategories(
  updates: Array<{ id: number; categoryId: number }>
): Promise<number> {
  await ensureDbInitialized();
  const sql = getSql();

  let updated = 0;
  for (const update of updates) {
    const result = (await sql`
      UPDATE tickets 
      SET category_id = ${update.categoryId}
      WHERE id = ${update.id}
    `) as unknown[];
    // neon returns the rows affected info
    if (result && (result as Record<string, unknown>[]).length !== undefined) {
      updated++;
    }
  }

  return updated;
}

// ─── Overview Stats ──────────────────────────────────────

export async function getSupportOverviewStats(
  from: string,
  to: string,
  handler?: string
): Promise<OverviewStats> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = await getActiveSupportMembers();
  let rows: {
    total: number;
    responded: number;
    unresponded: number;
    uniquehandlers: number;
  }[];

  if (handler) {
    // Only show stats if handler is a support member
    if (!supportMembers.includes(handler)) {
      return {
        totalTickets: 0,
        respondedTickets: 0,
        unrespondedTickets: 0,
        responseRate: 0,
        uniqueHandlers: 0,
      };
    }
    
    rows = (await sql`
      SELECT
        COUNT(*)::integer as total,
        SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
        SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded,
        COUNT(DISTINCT handler)::integer as uniquehandlers
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof rows;
  } else {
    rows = (await sql`
      SELECT
        COUNT(*)::integer as total,
        SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
        SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded,
        COUNT(DISTINCT handler)::integer as uniquehandlers
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND (handler IS NULL OR handler = ANY(${supportMembers}))
    `) as typeof rows;
  }

  const row = rows[0];
  return {
    totalTickets: row?.total ?? 0,
    respondedTickets: row?.responded ?? 0,
    unrespondedTickets: row?.unresponded ?? 0,
    responseRate:
      row && row.total > 0
        ? Math.round((row.responded / row.total) * 100)
        : 0,
    uniqueHandlers: row?.uniquehandlers ?? 0,
  };
}

export async function getOverviewStats(
  from: string,
  to: string,
  handler?: string,
  supportOnly?: boolean
): Promise<OverviewStats> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = supportOnly ? await getActiveSupportMembers() : [];
  let rows: {
    total: number;
    responded: number;
    unresponded: number;
    uniquehandlers: number;
  }[];

  if (handler) {
    // If support-only and handler is not a support member, return empty stats
    if (supportOnly && !supportMembers.includes(handler)) {
      return {
        totalTickets: 0,
        respondedTickets: 0,
        unrespondedTickets: 0,
        responseRate: 0,
        uniqueHandlers: 0,
      };
    }
    
    rows = (await sql`
      SELECT
        COUNT(*)::integer as total,
        SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
        SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded,
        COUNT(DISTINCT handler)::integer as uniquehandlers
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof rows;
  } else {
    if (supportOnly && supportMembers.length > 0) {
      rows = (await sql`
        SELECT
          COUNT(*)::integer as total,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded,
          COUNT(DISTINCT handler)::integer as uniquehandlers
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
      `) as typeof rows;
    } else {
      rows = (await sql`
        SELECT
          COUNT(*)::integer as total,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded,
          COUNT(DISTINCT handler)::integer as uniquehandlers
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      `) as typeof rows;
    }
  }

  const row = rows[0];
  return {
    totalTickets: row?.total ?? 0,
    respondedTickets: row?.responded ?? 0,
    unrespondedTickets: row?.unresponded ?? 0,
    responseRate:
      row && row.total > 0
        ? Math.round((row.responded / row.total) * 100)
        : 0,
    uniqueHandlers: row?.uniquehandlers ?? 0,
  };
}

// ─── Hourly Distribution ─────────────────────────────────

export async function getSupportHourlyDistribution(
  from: string,
  to: string,
  handler?: string
): Promise<HourlyBucket[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = await getActiveSupportMembers();
  let rows: { hour: number; count: number }[];

  if (handler) {
    // Only show stats if handler is a support member
    if (!supportMembers.includes(handler)) {
      return Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: 0,
      }));
    }
    
    rows = (await sql`
      SELECT
        EXTRACT(HOUR FROM submitted_at)::integer as hour,
        COUNT(*)::integer as count
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
      GROUP BY hour ORDER BY hour
    `) as typeof rows;
  } else {
    rows = (await sql`
      SELECT
        EXTRACT(HOUR FROM submitted_at)::integer as hour,
        COUNT(*)::integer as count
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND (handler IS NULL OR handler = ANY(${supportMembers}))
      GROUP BY hour ORDER BY hour
    `) as typeof rows;
  }

  const map = new Map(rows.map((r) => [r.hour, r.count]));
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: map.get(i) ?? 0,
  }));
}

export async function getHourlyDistribution(
  from: string,
  to: string,
  handler?: string,
  supportOnly?: boolean
): Promise<HourlyBucket[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = supportOnly ? await getActiveSupportMembers() : [];
  let rows: { hour: number; count: number }[];

  if (handler) {
    // If support-only and handler is not a support member, return empty stats
    if (supportOnly && !supportMembers.includes(handler)) {
      return Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: 0,
      }));
    }
    
    rows = (await sql`
      SELECT
        EXTRACT(HOUR FROM submitted_at)::integer as hour,
        COUNT(*)::integer as count
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
      GROUP BY hour ORDER BY hour
    `) as typeof rows;
  } else {
    if (supportOnly && supportMembers.length > 0) {
      rows = (await sql`
        SELECT
          EXTRACT(HOUR FROM submitted_at)::integer as hour,
          COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
        GROUP BY hour ORDER BY hour
      `) as typeof rows;
    } else {
      rows = (await sql`
        SELECT
          EXTRACT(HOUR FROM submitted_at)::integer as hour,
          COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        GROUP BY hour ORDER BY hour
      `) as typeof rows;
    }
  }

  const map = new Map(rows.map((r) => [r.hour, r.count]));
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: map.get(i) ?? 0,
  }));
}

// ─── Handler Leaderboard ─────────────────────────────────

export async function getSupportHandlerLeaderboard(
  from: string,
  to: string
): Promise<HandlerStat[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = await getActiveSupportMembers();
  
  const totalRows = (await sql`
    SELECT COUNT(*)::integer as total FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      AND handler IS NOT NULL
      AND handler = ANY(${supportMembers})
  `) as { total: number }[];

  const rows = (await sql`
    SELECT handler, COUNT(*)::integer as ticketshandled
    FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      AND handler IS NOT NULL
      AND handler = ANY(${supportMembers})
    GROUP BY handler
    ORDER BY ticketshandled DESC
  `) as { handler: string; ticketshandled: number }[];

  const total = totalRows[0]?.total ?? 0;
  return rows.map((r) => ({
    handler: r.handler,
    ticketsHandled: r.ticketshandled,
    percentage: total > 0 ? Math.round((r.ticketshandled / total) * 100) : 0,
  }));
}

export async function getHandlerLeaderboard(
  from: string,
  to: string
): Promise<HandlerStat[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const totalRows = (await sql`
    SELECT COUNT(*)::integer as total FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      AND handler IS NOT NULL
  `) as { total: number }[];

  const rows = (await sql`
    SELECT handler, COUNT(*)::integer as ticketshandled
    FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      AND handler IS NOT NULL
    GROUP BY handler
    ORDER BY ticketshandled DESC
  `) as { handler: string; ticketshandled: number }[];

  const total = totalRows[0]?.total ?? 0;
  return rows.map((r) => ({
    handler: r.handler,
    ticketsHandled: r.ticketshandled,
    percentage: total > 0 ? Math.round((r.ticketshandled / total) * 100) : 0,
  }));
}

// ─── Volume (day/week/month) ─────────────────────────────

export async function getSupportVolume(
  from: string,
  to: string,
  groupBy: "day" | "week" | "month",
  handler?: string
): Promise<VolumeBucket[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = await getActiveSupportMembers();
  // PostgreSQL group/label expressions
  let rows: VolumeBucket[];

  if (groupBy === "day") {
    if (handler) {
      // Only show stats if handler is a support member
      if (!supportMembers.includes(handler)) {
        return [];
      }
      
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at::date, 'YYYY-MM-DD') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler = ${handler}
        GROUP BY submitted_at::date
        ORDER BY submitted_at::date
      `) as VolumeBucket[];
    } else {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at::date, 'YYYY-MM-DD') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
        GROUP BY submitted_at::date
        ORDER BY submitted_at::date
      `) as VolumeBucket[];
    }
  } else if (groupBy === "week") {
    if (handler) {
      // Only show stats if handler is a support member
      if (!supportMembers.includes(handler)) {
        return [];
      }
      
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'IYYY-"W"IW') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler = ${handler}
        GROUP BY TO_CHAR(submitted_at, 'IYYY-"W"IW')
        ORDER BY label
      `) as VolumeBucket[];
    } else {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'IYYY-"W"IW') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
        GROUP BY TO_CHAR(submitted_at, 'IYYY-"W"IW')
        ORDER BY label
      `) as VolumeBucket[];
    }
  } else {
    if (handler) {
      // Only show stats if handler is a support member
      if (!supportMembers.includes(handler)) {
        return [];
      }
      
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'YYYY-MM') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler = ${handler}
        GROUP BY TO_CHAR(submitted_at, 'YYYY-MM')
        ORDER BY label
      `) as VolumeBucket[];
    } else {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'YYYY-MM') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
        GROUP BY TO_CHAR(submitted_at, 'YYYY-MM')
        ORDER BY label
      `) as VolumeBucket[];
    }
  }

  return rows;
}

export async function getVolume(
  from: string,
  to: string,
  groupBy: "day" | "week" | "month",
  handler?: string
): Promise<VolumeBucket[]> {
  await ensureDbInitialized();
  const sql = getSql();

  // PostgreSQL group/label expressions
  let rows: VolumeBucket[];

  if (groupBy === "day") {
    if (handler) {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at::date, 'YYYY-MM-DD') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler = ${handler}
        GROUP BY submitted_at::date
        ORDER BY submitted_at::date
      `) as VolumeBucket[];
    } else {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at::date, 'YYYY-MM-DD') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        GROUP BY submitted_at::date
        ORDER BY submitted_at::date
      `) as VolumeBucket[];
    }
  } else if (groupBy === "week") {
    if (handler) {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'IYYY-"W"IW') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler = ${handler}
        GROUP BY TO_CHAR(submitted_at, 'IYYY-"W"IW')
        ORDER BY label
      `) as VolumeBucket[];
    } else {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'IYYY-"W"IW') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        GROUP BY TO_CHAR(submitted_at, 'IYYY-"W"IW')
        ORDER BY label
      `) as VolumeBucket[];
    }
  } else {
    if (handler) {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'YYYY-MM') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler = ${handler}
        GROUP BY TO_CHAR(submitted_at, 'YYYY-MM')
        ORDER BY label
      `) as VolumeBucket[];
    } else {
      rows = (await sql`
        SELECT
          TO_CHAR(submitted_at, 'YYYY-MM') as label,
          COUNT(*)::integer as count,
          SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
          SUM(CASE WHEN handler IS NULL THEN 1 ELSE 0 END)::integer as unresponded
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        GROUP BY TO_CHAR(submitted_at, 'YYYY-MM')
        ORDER BY label
      `) as VolumeBucket[];
    }
  }

  return rows;
}

// ─── Keywords ────────────────────────────────────────────

const STOPWORDS_ES = new Set([
  "a", "al", "algo", "ante", "como", "con", "cual", "de", "del", "desde",
  "donde", "el", "ella", "ellos", "en", "es", "esa", "ese", "eso", "esta",
  "estas", "este", "esto", "estos", "fue", "ha", "hay", "la", "las", "le",
  "les", "lo", "los", "mas", "me", "mi", "muy", "no", "nos", "o", "otra",
  "otro", "para", "pero", "por", "que", "se", "si", "sin", "sobre", "su",
  "sus", "te", "ti", "tu", "tus", "un", "una", "uno", "unas", "unos", "ya",
  "yo", "y", "e", "ni", "u",
]);

export async function getKeywords(
  from: string,
  to: string
): Promise<KeywordStat[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const rows = (await sql`
    SELECT request FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
  `) as { request: string }[];

  const wordCounts = new Map<string, number>();

  for (const row of rows) {
    const words = row.request
      .toLowerCase()
      .replace(/[^a-záéíóúüñ\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS_ES.has(w));

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

// ─── Recent Tickets ──────────────────────────────────────

export async function getRecentTickets(
  from: string,
  to: string,
  limit = 50,
  offset = 0,
  search = "",
  handler?: string
): Promise<{ tickets: TicketRow[]; total: number }> {
  await ensureDbInitialized();
  const sql = getSql();

  const hasSearch = search.trim().length > 0;
  const searchParam = hasSearch ? `%${search.trim()}%` : "";

  let totalRows: { total: number }[];
  let tickets: TicketRow[];

  if (hasSearch && handler) {
    totalRows = (await sql`
      SELECT COUNT(*)::integer as total FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND (username ILIKE ${searchParam} OR character ILIKE ${searchParam}
             OR request ILIKE ${searchParam} OR handler ILIKE ${searchParam})
        AND handler = ${handler}
    `) as typeof totalRows;
    tickets = (await sql`
      SELECT t.id, t.username, t.character, t.request, t.submitted_at, t.handler, t.imported_at, t.category_id,
             tc.name AS category_name, tc.color AS category_color
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE t.submitted_at >= ${from}::timestamptz AND t.submitted_at < ${to}::timestamptz
        AND (t.username ILIKE ${searchParam} OR t.character ILIKE ${searchParam}
             OR t.request ILIKE ${searchParam} OR t.handler ILIKE ${searchParam})
        AND t.handler = ${handler}
      ORDER BY t.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as TicketRow[];
  } else if (hasSearch) {
    totalRows = (await sql`
      SELECT COUNT(*)::integer as total FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND (username ILIKE ${searchParam} OR character ILIKE ${searchParam}
             OR request ILIKE ${searchParam} OR handler ILIKE ${searchParam})
    `) as typeof totalRows;
    tickets = (await sql`
      SELECT t.id, t.username, t.character, t.request, t.submitted_at, t.handler, t.imported_at, t.category_id,
             tc.name AS category_name, tc.color AS category_color
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE t.submitted_at >= ${from}::timestamptz AND t.submitted_at < ${to}::timestamptz
        AND (t.username ILIKE ${searchParam} OR t.character ILIKE ${searchParam}
             OR t.request ILIKE ${searchParam} OR t.handler ILIKE ${searchParam})
      ORDER BY t.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as TicketRow[];
  } else if (handler) {
    totalRows = (await sql`
      SELECT COUNT(*)::integer as total FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof totalRows;
    tickets = (await sql`
      SELECT t.id, t.username, t.character, t.request, t.submitted_at, t.handler, t.imported_at, t.category_id,
             tc.name AS category_name, tc.color AS category_color
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE t.submitted_at >= ${from}::timestamptz AND t.submitted_at < ${to}::timestamptz
        AND t.handler = ${handler}
      ORDER BY t.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as TicketRow[];
  } else {
    totalRows = (await sql`
      SELECT COUNT(*)::integer as total FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
    `) as typeof totalRows;
    tickets = (await sql`
      SELECT t.id, t.username, t.character, t.request, t.submitted_at, t.handler, t.imported_at, t.category_id,
             tc.name AS category_name, tc.color AS category_color
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE t.submitted_at >= ${from}::timestamptz AND t.submitted_at < ${to}::timestamptz
      ORDER BY t.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as TicketRow[];
  }

  return { tickets, total: totalRows[0]?.total ?? 0 };
}

// ─── Date Range Helpers ──────────────────────────────────

export async function getDateRange(): Promise<{
  min: string;
  max: string;
} | null> {
  await ensureDbInitialized();
  const sql = getSql();

  const rows = (await sql`
    SELECT MIN(submitted_at)::text as min, MAX(submitted_at)::text as max FROM tickets
  `) as { min: string | null; max: string | null }[];

  const row = rows[0];
  if (!row?.min || !row?.max) return null;
  return { min: row.min, max: row.max };
}

// ─── Day of Week Distribution ────────────────────────────

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export async function getDayOfWeekDistribution(
  from: string,
  to: string,
  handler?: string,
  supportOnly?: boolean
): Promise<DayOfWeekBucket[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = supportOnly ? await getActiveSupportMembers() : [];
  let rows: { day: number; count: number }[];

  if (handler) {
    // If support-only and handler is not a support member, return empty stats
    if (supportOnly && !supportMembers.includes(handler)) {
      return Array.from({ length: 7 }, (_, i) => ({
        day: i,
        dayName: DAY_NAMES[i],
        count: 0,
      }));
    }
    
    rows = (await sql`
      SELECT
        EXTRACT(DOW FROM submitted_at)::integer as day,
        COUNT(*)::integer as count
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
      GROUP BY day ORDER BY day
    `) as typeof rows;
  } else {
    if (supportOnly && supportMembers.length > 0) {
      rows = (await sql`
        SELECT
          EXTRACT(DOW FROM submitted_at)::integer as day,
          COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
        GROUP BY day ORDER BY day
      `) as typeof rows;
    } else {
      rows = (await sql`
        SELECT
          EXTRACT(DOW FROM submitted_at)::integer as day,
          COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        GROUP BY day ORDER BY day
      `) as typeof rows;
    }
  }

  const map = new Map(rows.map((r) => [r.day, r.count]));
  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    dayName: DAY_NAMES[i],
    count: map.get(i) ?? 0,
  }));
}

// ─── Top Users (Recurrence) ──────────────────────────────

export async function getTopUsers(
  from: string,
  to: string,
  limit = 15,
  handler?: string,
  supportOnly?: boolean
): Promise<TopUser[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = supportOnly ? await getActiveSupportMembers() : [];

  if (handler) {
    // If support-only and handler is not a support member, return empty stats
    if (supportOnly && !supportMembers.includes(handler)) {
      return [];
    }
    
    return (await sql`
      SELECT
        username,
        character,
        COUNT(*)::integer as "ticketCount",
        SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as "respondedCount"
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
      GROUP BY username, character
      ORDER BY "ticketCount" DESC
      LIMIT ${limit}
    `) as TopUser[];
  }

  if (supportOnly && supportMembers.length > 0) {
    return (await sql`
      SELECT
        username,
        character,
        COUNT(*)::integer as "ticketCount",
        SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as "respondedCount"
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND (handler IS NULL OR handler = ANY(${supportMembers}))
      GROUP BY username, character
      ORDER BY "ticketCount" DESC
      LIMIT ${limit}
    `) as TopUser[];
  }

  return (await sql`
    SELECT
      username,
      character,
      COUNT(*)::integer as "ticketCount",
      SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as "respondedCount"
    FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
    GROUP BY username, character
    ORDER BY "ticketCount" DESC
    LIMIT ${limit}
  `) as TopUser[];
}

// ─── Handler Hourly Heatmap ──────────────────────────────

export async function getHandlerHourly(
  from: string,
  to: string,
  handler?: string,
  supportOnly?: boolean
): Promise<HandlerHourly[]> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = supportOnly ? await getActiveSupportMembers() : [];
  
  // Debug logging
  console.log("getHandlerHourly - supportOnly:", supportOnly);
  console.log("getHandlerHourly - supportMembers:", supportMembers);
  
  let rows: { handler: string; hour: number; count: number }[];

  if (handler) {
    // If support-only and handler is not a support member, return empty stats
    if (supportOnly && !supportMembers.includes(handler)) {
      console.log("Handler not in support members, returning empty");
      return [];
    }
    
    rows = (await sql`
      SELECT
        handler,
        EXTRACT(HOUR FROM submitted_at)::integer as hour,
        COUNT(*)::integer as count
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
      GROUP BY handler, hour
      ORDER BY handler, hour
    `) as typeof rows;
  } else {
    if (supportOnly && supportMembers.length > 0) {
      console.log("Using support-only filter with members:", supportMembers);
      rows = (await sql`
        SELECT
          handler,
          EXTRACT(HOUR FROM submitted_at)::integer as hour,
          COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler IS NOT NULL
          AND handler = ANY(${supportMembers})
        GROUP BY handler, hour
        ORDER BY handler, hour
      `) as typeof rows;
    } else {
      console.log("Using all handlers (no support filter)");
      rows = (await sql`
        SELECT
          handler,
          EXTRACT(HOUR FROM submitted_at)::integer as hour,
          COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler IS NOT NULL
        GROUP BY handler, hour
        ORDER BY handler, hour
      `) as typeof rows;
    }
  }

  console.log("Raw rows before filtering:", rows.length);

  const map = new Map<string, number[]>();
  for (const row of rows) {
    if (!map.has(row.handler)) {
      map.set(row.handler, new Array(24).fill(0));
    }
    map.get(row.handler)![row.hour] = row.count;
  }

  const result = Array.from(map.entries()).map(([handler, hours]) => ({
    handler,
    hours,
  }));
  
  console.log("Final result handlers:", result.map(r => r.handler));
  return result;
}

// ─── Period Comparison ───────────────────────────────────

export async function getPeriodComparison(
  from: string,
  to: string
): Promise<PeriodComparison> {
  await ensureDbInitialized();
  const sql = getSql();

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diff = toDate.getTime() - fromDate.getTime();
  const prevFrom = new Date(fromDate.getTime() - diff)
    .toISOString()
    .slice(0, 10);

  const getCounts = async (f: string, t: string) => {
    const rows = (await sql`
      SELECT
        COUNT(*)::integer as total,
        SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
        COUNT(DISTINCT handler)::integer as handlers
      FROM tickets
      WHERE submitted_at >= ${f}::timestamptz AND submitted_at < ${t}::timestamptz
    `) as { total: number; responded: number; handlers: number }[];
    return rows[0];
  };

  const current = await getCounts(from, to);
  const previous = await getCounts(prevFrom, from);

  const pctChange = (cur: number, prev: number) =>
    prev === 0
      ? cur > 0
        ? 100
        : 0
      : Math.round(((cur - prev) / prev) * 100);

  return {
    current,
    previous,
    changes: {
      total: pctChange(current.total, previous.total),
      responded: pctChange(current.responded, previous.responded),
      handlers: pctChange(current.handlers, previous.handlers),
    },
  };
}

// ─── Advanced Stats ──────────────────────────────────────

export async function getAdvancedStats(
  from: string,
  to: string,
  handler?: string,
  supportOnly?: boolean
): Promise<AdvancedStats> {
  await ensureDbInitialized();
  const sql = getSql();

  const supportMembers = supportOnly ? await getActiveSupportMembers() : [];
  let dayCountRows: { days: number }[];
  let totalRows: { total: number }[];
  let peakRows: { hour: number; count: number }[];
  let busiestRows: { day: string; count: number }[];
  let uniqueUsersRows: { count: number }[];
  let handlerCountRows: { count: number }[];
  let respondedTotalRows: { count: number }[];

  if (handler) {
    // If support-only and handler is not a support member, return empty stats
    if (supportOnly && !supportMembers.includes(handler)) {
      return {
        avgTicketsPerDay: 0,
        peakHour: 0,
        peakHourCount: 0,
        busiestDay: "-",
        busiestDayCount: 0,
        uniqueUsers: 0,
        avgPerHandler: 0,
      };
    }
    
    dayCountRows = (await sql`
      SELECT COUNT(DISTINCT submitted_at::date)::integer as days FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof dayCountRows;
    totalRows = (await sql`
      SELECT COUNT(*)::integer as total FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof totalRows;
    peakRows = (await sql`
      SELECT EXTRACT(HOUR FROM submitted_at)::integer as hour, COUNT(*)::integer as count
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
      GROUP BY hour ORDER BY count DESC LIMIT 1
    `) as typeof peakRows;
    busiestRows = (await sql`
      SELECT submitted_at::date::text as day, COUNT(*)::integer as count
      FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
      GROUP BY submitted_at::date ORDER BY count DESC LIMIT 1
    `) as typeof busiestRows;
    uniqueUsersRows = (await sql`
      SELECT COUNT(DISTINCT username)::integer as count FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof uniqueUsersRows;
    handlerCountRows = (await sql`
      SELECT COUNT(DISTINCT handler)::integer as count FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof handlerCountRows;
    respondedTotalRows = (await sql`
      SELECT COUNT(*)::integer as count FROM tickets
      WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        AND handler = ${handler}
    `) as typeof respondedTotalRows;
  } else {
    if (supportOnly && supportMembers.length > 0) {
      dayCountRows = (await sql`
        SELECT COUNT(DISTINCT submitted_at::date)::integer as days FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
      `) as typeof dayCountRows;
      totalRows = (await sql`
        SELECT COUNT(*)::integer as total FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
      `) as typeof totalRows;
      peakRows = (await sql`
        SELECT EXTRACT(HOUR FROM submitted_at)::integer as hour, COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
        GROUP BY hour ORDER BY count DESC LIMIT 1
      `) as typeof peakRows;
      busiestRows = (await sql`
        SELECT submitted_at::date::text as day, COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
        GROUP BY submitted_at::date ORDER BY count DESC LIMIT 1
      `) as typeof busiestRows;
      uniqueUsersRows = (await sql`
        SELECT COUNT(DISTINCT username)::integer as count FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND (handler IS NULL OR handler = ANY(${supportMembers}))
      `) as typeof uniqueUsersRows;
      handlerCountRows = (await sql`
        SELECT COUNT(DISTINCT handler)::integer as count FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler IS NOT NULL
          AND handler = ANY(${supportMembers})
      `) as typeof handlerCountRows;
      respondedTotalRows = (await sql`
        SELECT COUNT(*)::integer as count FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler IS NOT NULL
          AND handler = ANY(${supportMembers})
      `) as typeof respondedTotalRows;
    } else {
      dayCountRows = (await sql`
        SELECT COUNT(DISTINCT submitted_at::date)::integer as days FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      `) as typeof dayCountRows;
      totalRows = (await sql`
        SELECT COUNT(*)::integer as total FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      `) as typeof totalRows;
      peakRows = (await sql`
        SELECT EXTRACT(HOUR FROM submitted_at)::integer as hour, COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        GROUP BY hour ORDER BY count DESC LIMIT 1
      `) as typeof peakRows;
      busiestRows = (await sql`
        SELECT submitted_at::date::text as day, COUNT(*)::integer as count
        FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
        GROUP BY submitted_at::date ORDER BY count DESC LIMIT 1
      `) as typeof busiestRows;
      uniqueUsersRows = (await sql`
        SELECT COUNT(DISTINCT username)::integer as count FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
      `) as typeof uniqueUsersRows;
      handlerCountRows = (await sql`
        SELECT COUNT(DISTINCT handler)::integer as count FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler IS NOT NULL
      `) as typeof handlerCountRows;
      respondedTotalRows = (await sql`
        SELECT COUNT(*)::integer as count FROM tickets
        WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
          AND handler IS NOT NULL
      `) as typeof respondedTotalRows;
    }
  }

  const days = dayCountRows[0]?.days ?? 0;
  const total = totalRows[0]?.total ?? 0;
  const peak = peakRows[0];
  const busiest = busiestRows[0];
  const hCount = handlerCountRows[0]?.count ?? 0;
  const rTotal = respondedTotalRows[0]?.count ?? 0;

  return {
    avgTicketsPerDay: days > 0 ? Math.round((total / days) * 10) / 10 : 0,
    peakHour: peak?.hour ?? 0,
    peakHourCount: peak?.count ?? 0,
    busiestDay: busiest?.day ?? "-",
    busiestDayCount: busiest?.count ?? 0,
    uniqueUsers: uniqueUsersRows[0]?.count ?? 0,
    avgPerHandler:
      hCount > 0 ? Math.round((rTotal / hCount) * 10) / 10 : 0,
  };
}

// ─── Data Management ─────────────────────────────────────

export interface DbInfo {
  totalTickets: number;
  totalResponded: number;
  uniqueHandlers: number;
  uniqueUsers: number;
  dateRange: { min: string; max: string } | null;
  dbSizeKb: number;
}

export async function getDbInfo(): Promise<DbInfo> {
  await ensureDbInitialized();
  const sql = getSql();

  const counts = (await sql`
    SELECT
      COUNT(*)::integer as total,
      SUM(CASE WHEN handler IS NOT NULL THEN 1 ELSE 0 END)::integer as responded,
      COUNT(DISTINCT handler)::integer as handlers,
      COUNT(DISTINCT username)::integer as users
    FROM tickets
  `) as {
    total: number;
    responded: number;
    handlers: number;
    users: number;
  }[];

  const range = await getDateRange();

  const sizeRow = (await sql`
    SELECT pg_database_size(current_database())::bigint as size
  `) as { size: number }[];

  return {
    totalTickets: counts[0]?.total ?? 0,
    totalResponded: counts[0]?.responded ?? 0,
    uniqueHandlers: counts[0]?.handlers ?? 0,
    uniqueUsers: counts[0]?.users ?? 0,
    dateRange: range,
    dbSizeKb: sizeRow[0] ? Math.round(Number(sizeRow[0].size) / 1024) : 0,
  };
}

export async function deleteTicketsByRange(
  from: string,
  to: string
): Promise<number> {
  await ensureDbInitialized();
  const sql = getSql();

  const before = (await sql`
    SELECT COUNT(*)::integer as count FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
  `) as { count: number }[];

  await sql`
    DELETE FROM tickets
    WHERE submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
  `;

  return before[0]?.count ?? 0;
}

export async function deleteAllTickets(): Promise<number> {
  await ensureDbInitialized();
  const sql = getSql();

  const before = (await sql`
    SELECT COUNT(*)::integer as count FROM tickets
  `) as { count: number }[];

  await sql`DELETE FROM tickets`;

  return before[0]?.count ?? 0;
}

// ─── Handler Detail Stats ────────────────────────────────

export interface HandlerDetail {
  handler: string;
  totalTickets: number;
  hourly: { hour: number; count: number }[];
  weekday: { day: number; dayName: string; count: number }[];
  recentTickets: {
    id: number;
    username: string;
    character: string;
    request: string;
    submitted_at: string;
  }[];
  topUsers: { username: string; count: number }[];
  categories: { name: string; color: string; count: number }[];
}

export async function getHandlerDetail(
  handler: string,
  from: string,
  to: string
): Promise<HandlerDetail> {
  await ensureDbInitialized();
  const sql = getSql();

  const totalRows = (await sql`
    SELECT COUNT(*)::integer as count FROM tickets
    WHERE handler = ${handler}
      AND submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
  `) as { count: number }[];

  const hourly = (await sql`
    SELECT EXTRACT(HOUR FROM submitted_at)::integer as hour, COUNT(*)::integer as count
    FROM tickets
    WHERE handler = ${handler}
      AND submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
    GROUP BY hour ORDER BY hour
  `) as { hour: number; count: number }[];

  const weekdayRows = (await sql`
    SELECT EXTRACT(DOW FROM submitted_at)::integer as day, COUNT(*)::integer as count
    FROM tickets
    WHERE handler = ${handler}
      AND submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
    GROUP BY day ORDER BY day
  `) as { day: number; count: number }[];

  const dayMap = new Map(weekdayRows.map((r) => [r.day, r.count]));
  const weekday = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    dayName: DAY_NAMES[i],
    count: dayMap.get(i) ?? 0,
  }));

  const recentTickets = (await sql`
    SELECT id, username, character, request, submitted_at::text
    FROM tickets
    WHERE handler = ${handler}
      AND submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
    ORDER BY submitted_at DESC LIMIT 10
  `) as HandlerDetail["recentTickets"];

  const topUsers = (await sql`
    SELECT username, COUNT(*)::integer as count
    FROM tickets
    WHERE handler = ${handler}
      AND submitted_at >= ${from}::timestamptz AND submitted_at < ${to}::timestamptz
    GROUP BY username ORDER BY count DESC LIMIT 5
  `) as { username: string; count: number }[];

  const categories = (await sql`
    SELECT tc.name, tc.color, COUNT(*)::integer as count
    FROM tickets t
    JOIN ticket_categories tc ON t.category_id = tc.id
    WHERE t.handler = ${handler}
      AND t.submitted_at >= ${from}::timestamptz AND t.submitted_at < ${to}::timestamptz
    GROUP BY tc.name, tc.color
    ORDER BY count DESC
  `) as { name: string; color: string; count: number }[];

  return {
    handler,
    totalTickets: totalRows[0]?.count ?? 0,
    hourly,
    weekday,
    recentTickets,
    topUsers,
    categories,
  };
}
