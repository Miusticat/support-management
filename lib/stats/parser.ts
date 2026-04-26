import type { TicketRecord } from "./types";

/**
 * Decodes common HTML entities found in copy/pasted data.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Parses raw tab-separated text from the GTAW Help Me panel into structured ticket records.
 *
 * Expected columns (tab-separated):
 *   #  Username  Character  Help Me Request  Request Submitted At  Handler
 *
 * Handles:
 * - Header rows (auto-detected and skipped)
 * - Empty lines (skipped)
 * - HTML entities in request text
 * - Handler "N/A" → null
 * - Flexible whitespace/tab separation
 */
export function parseTickets(raw: string): TicketRecord[] {
  const lines = raw.split("\n").map((l) => l.trimEnd());
  const tickets: TicketRecord[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Split by tab
    const parts = line.split("\t").map((p) => p.trim());

    // Skip header-like rows
    if (parts[0] === "#" || parts[0].toLowerCase() === "id") continue;
    if (parts.some((p) => p === "Help Me Request" || p === "Username"))
      continue;

    // We need at least 6 columns
    if (parts.length < 6) continue;

    const id = parseInt(parts[0], 10);
    if (isNaN(id)) continue;

    const username = parts[1];
    const character = parts[2];
    const request = decodeEntities(parts[3]);
    const submittedAt = parts[4];
    const handlerRaw = parts[5];
    const handler =
      !handlerRaw || handlerRaw === "N/A" ? null : handlerRaw;

    // Validate the date loosely
    if (!submittedAt || !/\d{4}-\d{2}-\d{2}/.test(submittedAt)) continue;

    tickets.push({
      id,
      username,
      character,
      request,
      submittedAt,
      handler,
    });
  }

  return tickets;
}
