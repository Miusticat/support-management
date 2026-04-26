import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import type {
  OverviewStats,
  HandlerStat,
  HourlyBucket,
  AdvancedStats,
  DayOfWeekBucket,
  TopUser,
} from "./types";

// ─── Capture dashboard as image ──────────────────────────

export async function exportAsImage(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const dataUrl = await toPng(el, {
    backgroundColor: "#0d0d0d",
    pixelRatio: 2,
    style: {
      padding: "24px",
    },
  });

  saveAs(dataUrl, `${filename}.png`);
}

// ─── Capture dashboard as PDF ────────────────────────────

export async function exportAsPdf(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const dataUrl = await toPng(el, {
    backgroundColor: "#0d0d0d",
    pixelRatio: 2,
    style: {
      padding: "24px",
    },
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
  });

  const pxToMm = 0.264583;
  const imgWidthMm = img.width * pxToMm;
  const imgHeightMm = img.height * pxToMm;

  const pdf = new jsPDF({
    orientation: imgWidthMm > imgHeightMm ? "landscape" : "portrait",
    unit: "mm",
    format: [imgWidthMm, imgHeightMm],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, imgWidthMm, imgHeightMm);
  pdf.save(`${filename}.pdf`);
}

// ─── Discord Markdown ────────────────────────────────────

const DISCORD_CHAR_LIMIT = 4000;

interface DiscordExportData {
  from: string;
  to: string;
  overview: OverviewStats | null;
  handlers: HandlerStat[];
  hourly: HourlyBucket[];
  advanced: AdvancedStats | null;
  comparison: unknown;
  weekday: DayOfWeekBucket[];
  topUsers: TopUser[];
  keywords: unknown[];
}

export type DiscordExportMode = "full" | "summary" | "leaderboard";

// Visual bar builder with gradient chars
function bar(value: number, max: number, width: number): string {
  if (max === 0) return "░".repeat(width);
  const filled = Math.round((value / max) * width);
  return "▓".repeat(filled) + "░".repeat(width - filled);
}

// Percentage bar with label
function pctBar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

// Format number aligned
function num(n: number, pad = 4): string {
  return String(n).padStart(pad);
}

// Trend arrow
function trend(value: number): string {
  if (value > 0) return `▲ +${value}%`;
  if (value < 0) return `▼ ${value}%`;
  return `— 0%`;
}

function divider(): string {
  return "─".repeat(40);
}

function footer(): string {
  return `${divider()}\n-# Generado por Support Tracker · ${new Date().toLocaleString("es-AR")}`;
}

// Build each section independently so we can budget them
function buildHeader(data: DiscordExportData): string {
  return [
    `# 📊  REPORTE DE SOPORTE — GTAW`,
    `> 📅 **${data.from}**  →  **${data.to}**`,
    ``,
  ].join("\n");
}

function buildOverview(o: OverviewStats): string {
  const rateColor = o.responseRate >= 80 ? "🟢" : o.responseRate >= 50 ? "🟡" : "🔴";
  return [
    `## 📋  Resumen general`,
    `\`\`\``,
    `  📨 Total tickets:    ${o.totalTickets}`,
    `  ✅ Respondidos:      ${o.respondedTickets}`,
    `  ❌ Sin responder:    ${o.unrespondedTickets}`,
    `  👥 Handlers activos: ${o.uniqueHandlers}`,
    `  ${pctBar(o.responseRate, 20)} ${o.responseRate}%`,
    `\`\`\``,
    `${rateColor} Tasa de respuesta: **${o.responseRate}%**`,
    ``,
  ].join("\n");
}

function buildAdvanced(a: AdvancedStats): string {
  return [
    `## 📈  Estadísticas clave`,
    `\`\`\`yaml`,
    `Promedio diario:   ${a.avgTicketsPerDay} tickets/día`,
    `Hora pico:         ${String(a.peakHour).padStart(2, "0")}:00 hs  (${a.peakHourCount} tickets)`,
    `Día más activo:    ${a.busiestDay}  (${a.busiestDayCount} tickets)`,
    `Usuarios únicos:   ${a.uniqueUsers}`,
    `Prom. por handler: ${a.avgPerHandler} tickets`,
    `\`\`\``,
    ``,
  ].join("\n");
}

function buildLeaderboard(handlers: HandlerStat[], maxRows?: number): string {
  const list = maxRows ? handlers.slice(0, maxRows) : handlers;
  const maxTk = Math.max(...list.map((h) => h.ticketsHandled));
  const maxName = Math.min(Math.max(...list.map((h) => h.handler.length), 6), 16);
  const L: string[] = [];
  L.push(`## 🏆  Leaderboard de handlers`);
  L.push(`\`\`\``);
  list.forEach((h, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${String(i + 1).padStart(2)}.`;
    const name = h.handler.length > maxName ? h.handler.slice(0, maxName - 1) + "…" : h.handler.padEnd(maxName);
    const b = bar(h.ticketsHandled, maxTk, 12);
    L.push(`${medal} ${name} ${num(h.ticketsHandled, 4)} ${b} ${h.percentage}%`);
  });
  if (maxRows && handlers.length > maxRows) {
    L.push(`   ... y ${handlers.length - maxRows} más`);
  }
  L.push(`\`\`\``);
  L.push(``);
  return L.join("\n");
}

function buildHourly(hourly: HourlyBucket[]): string {
  const active = hourly.filter((h) => h.count > 0);
  if (!active.length) return "";
  const maxC = Math.max(...active.map((h) => h.count));
  const sorted = [...active].sort((a, b) => b.count - a.count);
  const peakSet = new Set(sorted.slice(0, 3).map((h) => h.hour));
  const L: string[] = [];
  L.push(`## ⏰  Distribución por hora`);
  L.push(`\`\`\``);
  for (const h of active) {
    const b = bar(h.count, maxC, 16);
    const peak = peakSet.has(h.hour) ? " ◀" : "";
    L.push(`  ${String(h.hour).padStart(2, "0")}:00 │${b}│ ${num(h.count)}${peak}`);
  }
  L.push(`\`\`\``);
  L.push(``);
  return L.join("\n");
}

function buildWeekday(weekday: DayOfWeekBucket[]): string {
  if (!weekday.some((d) => d.count > 0)) return "";
  const maxD = Math.max(...weekday.map((d) => d.count));
  const L: string[] = [];
  L.push(`## 📅  Actividad semanal`);
  L.push(`\`\`\``);
  for (const d of weekday) {
    const b = d.count > 0 ? bar(d.count, maxD, 14) : "░".repeat(14);
    L.push(`  ${d.dayName.slice(0, 3).padEnd(4)}│${b}│ ${num(d.count)}`);
  }
  L.push(`\`\`\``);
  L.push(``);
  return L.join("\n");
}

function buildTopUsers(users: TopUser[], maxRows = 5): string {
  if (!users.length) return "";
  const top = users.slice(0, maxRows);
  const L: string[] = [];
  L.push(`## 👤  Usuarios frecuentes`);
  for (const u of top) {
    L.push(`- **${u.username}** (${u.character}): ${u.ticketCount} tk, ${u.respondedCount} resp.`);
  }
  L.push(``);
  return L.join("\n");
}

/**
 * Generates Discord markdown report(s) respecting the 4000 char limit.
 * Returns an array of messages — usually 1, but can be 2+ for large datasets.
 */
export function exportAsDiscordMarkdown(
  data: DiscordExportData,
  mode: DiscordExportMode = "full"
): string[] {
  const header = buildHeader(data);
  const foot = footer();

  // Build all relevant sections in priority order
  const sections: string[] = [];

  if (data.overview) sections.push(buildOverview(data.overview));

  if (data.advanced && mode !== "leaderboard")
    sections.push(buildAdvanced(data.advanced));

  if (mode === "summary") {
    return packMessages(header, sections, foot);
  }

  if (data.handlers.length > 0) {
    // Try full leaderboard first, then trim if too big
    const fullLb = buildLeaderboard(data.handlers);
    if (fullLb.length < 1200) {
      sections.push(fullLb);
    } else {
      // Cap at top 15
      sections.push(buildLeaderboard(data.handlers, 15));
    }
  }

  if (mode === "leaderboard") {
    return packMessages(header, sections, foot);
  }

  // Additional sections for "full" mode — lower priority, can be dropped
  sections.push(buildHourly(data.hourly));
  sections.push(buildWeekday(data.weekday));
  sections.push(buildTopUsers(data.topUsers, 5));

  return packMessages(header, sections.filter(Boolean), foot);
}

/**
 * Pack sections into messages respecting DISCORD_CHAR_LIMIT.
 * Each message starts with the header and ends with the footer.
 */
function packMessages(header: string, sections: string[], foot: string): string[] {
  const messages: string[] = [];
  let current = header;
  const overhead = header.length + foot.length + 2; // \n buffer

  for (const section of sections) {
    // Would this section fit in the current message?
    if (current.length + section.length + foot.length + 1 <= DISCORD_CHAR_LIMIT) {
      current += section;
    } else if (current === header) {
      // Even the first section doesn't fit with header — force it in anyway
      // but trim to avoid exceeding (unlikely with single sections)
      current += section;
      messages.push((current + foot).slice(0, DISCORD_CHAR_LIMIT));
      current = header;
    } else {
      // Close current message and start a new one
      messages.push(current + foot);
      current = header + section;
    }
  }

  // Flush remaining
  if (current.length > header.length) {
    messages.push(current + foot);
  } else if (messages.length === 0) {
    // Nothing was added — just the header
    messages.push(current + foot);
  }

  return messages;
}

// ─── CSV Export ──────────────────────────────────────────

export function exportAsCsv(
  tickets: Array<{
    id: number;
    username: string;
    character: string;
    request: string;
    submitted_at: string;
    handler: string | null;
    category_name?: string | null;
  }>,
  filename: string
) {
  const header = ["ID", "Usuario", "Personaje", "Solicitud", "Fecha", "Categoría", "Handler"];
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const rows = tickets.map((t) => [
    String(t.id),
    escape(t.username),
    escape(t.character),
    escape(t.request),
    t.submitted_at,
    escape(t.category_name ?? "Sin categoría"),
    t.handler ?? "N/A",
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, `${filename}.csv`);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}
