"use client";

import { saveAs } from "file-saver";
import type {
  OverviewStats,
  HandlerStat,
  HourlyBucket,
  AdvancedStats,
  DayOfWeekBucket,
} from "@/lib/stats/types";

export interface BannerData {
  from: string;
  to: string;
  overview: OverviewStats | null;
  handlers: HandlerStat[];
  hourly: HourlyBucket[];
  advanced: AdvancedStats | null;
  weekday: DayOfWeekBucket[];
}

const W = 1920;
const H = 1080;
const PAD = 52;

// Colors
const BG = "#080808";
const AMBER = "#ffac00";
const AMBER_DIM = "#b37800";
const GREEN = "#22c55e";
const RED = "#ef4444";
const YELLOW = "#eab308";
const TEXT = "#f0f0f0";
const TEXT_SEC = "#9ca3af";
const TEXT_DIM = "#555b66";
const CARD_BG = "#111111";
const CARD_BORDER = "#1e1e1e";
const CARD_BG_ALT = "#0f0f0f";

const FONT_TITLE = "Versus Ultra";
const FONT_BODY = '"Inter", "Segoe UI", Arial, sans-serif';

// ─── Load custom font ────────────────────────────────────

async function loadVersusFont(): Promise<void> {
  try {
    const font = new FontFace(
      "Versus Ultra",
      "url(/fonts/Versus-Ultra.woff2)",
      { weight: "400", style: "normal" }
    );
    const loaded = await font.load();
    document.fonts.add(loaded);
  } catch {
    // Fallback silently — titles will use body font
  }
}

// ─── Drawing helpers ─────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill?: string, stroke?: string, lineW = 1
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineW; ctx.stroke(); }
}

function text(
  ctx: CanvasRenderingContext2D, t: string,
  x: number, y: number, color: string, size: number,
  opts: { weight?: number; align?: CanvasTextAlign; maxW?: number; font?: string } = {}
) {
  const { weight = 400, align = "left", maxW, font = FONT_BODY } = opts;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  if (maxW) {
    let s = t;
    while (ctx.measureText(s).width > maxW && s.length > 1) s = s.slice(0, -1);
    if (s !== t) s += "…";
    ctx.fillText(s, x, y);
  } else {
    ctx.fillText(t, x, y);
  }
}

function title(
  ctx: CanvasRenderingContext2D, t: string,
  x: number, y: number, color: string, size: number,
  align: CanvasTextAlign = "left"
) {
  text(ctx, t, x, y, color, size, { weight: 400, align, font: `"${FONT_TITLE}", ${FONT_BODY}` });
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, color: string, alpha = 0.15
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color.replace(")", `,${alpha})`).replace("rgb", "rgba"));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

// ─── Main generator ──────────────────────────────────────

export async function generateDiscordBanner(data: BannerData): Promise<void> {
  if (!data.overview) return;

  await loadVersusFont();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const ov = data.overview;
  const adv = data.advanced;
  const handlers = data.handlers.slice(0, 15);
  const maxHandler = Math.max(...handlers.map((h) => h.ticketsHandled), 1);
  const maxHourly = Math.max(...data.hourly.map((h) => h.count), 1);
  const peakHour = data.hourly.reduce((a, b) => (b.count > a.count ? b : a), data.hourly[0]);
  const maxWeekday = Math.max(...data.weekday.map((d) => d.count), 1);
  const peakDay = data.weekday.reduce((a, b) => (b.count > a.count ? b : a), data.weekday[0]);
  const rateColor = ov.responseRate >= 80 ? GREEN : ov.responseRate >= 50 ? YELLOW : RED;

  // ── Background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Radial glow spots
  drawGlow(ctx, 200, 120, 500, "rgb(255,172,0)", 0.06);
  drawGlow(ctx, W - 300, H - 200, 600, "rgb(255,140,0)", 0.04);
  drawGlow(ctx, W / 2, H / 2, 700, "rgb(255,172,0)", 0.02);

  // Subtle noise pattern
  for (let i = 0; i < 12000; i++) {
    const nx = Math.random() * W;
    const ny = Math.random() * H;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
    ctx.fillRect(nx, ny, 1, 1);
  }

  // Top accent bar (gradient)
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, "rgba(255,172,0,0)");
  topGrad.addColorStop(0.3, AMBER);
  topGrad.addColorStop(0.7, "#ff8c00");
  topGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 3);

  // Bottom accent bar
  const botGrad = ctx.createLinearGradient(0, 0, W, 0);
  botGrad.addColorStop(0, "rgba(255,172,0,0)");
  botGrad.addColorStop(0.3, "rgba(255,172,0,0.3)");
  botGrad.addColorStop(0.7, "rgba(255,140,0,0.3)");
  botGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 2, W, 2);

  // ══════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════

  title(ctx, "SUPPORT REPORT", PAD, PAD - 6, AMBER, 48);

  // Decorative line under title
  const titleW = ctx.measureText("SUPPORT REPORT").width || 400;
  const lineGrad = ctx.createLinearGradient(PAD, 0, PAD + titleW, 0);
  lineGrad.addColorStop(0, AMBER);
  lineGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(PAD, PAD + 50, titleW + 40, 2);

  text(ctx, "GTA WORLD", PAD, PAD + 60, TEXT_SEC, 14, { weight: 600 });

  // Date range badge
  const dateStr = `${data.from}  →  ${data.to}`;
  roundRect(ctx, PAD + 110, PAD + 56, ctx.measureText(dateStr).width + 24, 24, 6, "rgba(255,172,0,0.08)", "rgba(255,172,0,0.2)");
  text(ctx, dateStr, PAD + 122, PAD + 61, AMBER_DIM, 13, { weight: 500 });

  // Response rate hero (top right)
  const heroW = 240;
  const heroH = 80;
  const heroX = W - PAD - heroW;
  const heroY = PAD;
  roundRect(ctx, heroX, heroY, heroW, heroH, 14, "rgba(0,0,0,0.5)", "rgba(255,172,0,0.15)");
  // Inner glow
  drawGlow(ctx, heroX + heroW / 2, heroY + heroH / 2, 100, "rgb(255,172,0)", 0.06);
  text(ctx, "TASA DE RESPUESTA", heroX + heroW / 2, heroY + 12, TEXT_DIM, 10, { weight: 600, align: "center" });
  title(ctx, `${ov.responseRate}%`, heroX + heroW / 2, heroY + 28, rateColor, 40, "center");

  // ── Layout ──
  const colY = PAD + 108;
  const colH = H - colY - 44;
  const leftW = 520;
  const rightW = 360;
  const gap = 20;
  const centerW = W - 2 * PAD - leftW - rightW - 2 * gap;
  const leftX = PAD;
  const centerX = leftX + leftW + gap;
  const rightX = centerX + centerW + gap;

  // ══════════════════════════════════════════════════════════
  // LEFT COLUMN — Stats + Advanced + Hourly + Weekday
  // ══════════════════════════════════════════════════════════

  // Section title
  text(ctx, "RESUMEN", leftX, colY - 2, TEXT_DIM, 10, { weight: 700 });
  const sectionLineW = leftW;
  const slGrad = ctx.createLinearGradient(leftX, 0, leftX + sectionLineW, 0);
  slGrad.addColorStop(0, "rgba(255,172,0,0.3)");
  slGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = slGrad;
  ctx.fillRect(leftX, colY + 12, sectionLineW, 1);

  // Stat cards (2×2)
  const scY = colY + 22;
  const statCardW = (leftW - 14) / 2;
  const statCardH = 78;
  const statCards = [
    { label: "TOTAL TICKETS", value: ov.totalTickets.toLocaleString(), color: AMBER, glow: "rgb(255,172,0)" },
    { label: "RESPONDIDOS", value: ov.respondedTickets.toLocaleString(), color: GREEN, glow: "rgb(34,197,94)" },
    { label: "SIN RESPONDER", value: ov.unrespondedTickets.toLocaleString(), color: RED, glow: "rgb(239,68,68)" },
    { label: "HANDLERS ACTIVOS", value: String(ov.uniqueHandlers), color: TEXT, glow: "rgb(200,200,200)" },
  ];
  statCards.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = leftX + col * (statCardW + 14);
    const sy = scY + row * (statCardH + 10);
    roundRect(ctx, sx, sy, statCardW, statCardH, 12, CARD_BG, CARD_BORDER);
    drawGlow(ctx, sx + 40, sy + statCardH - 10, 60, s.glow, 0.08);
    text(ctx, s.label, sx + 18, sy + 14, TEXT_DIM, 10, { weight: 600 });
    title(ctx, s.value, sx + 18, sy + 32, s.color, 32);
  });

  // Advanced stats row
  let advY = scY + 2 * (statCardH + 10) + 8;
  if (adv) {
    const advH = 68;
    roundRect(ctx, leftX, advY, leftW, advH, 12, CARD_BG, CARD_BORDER);
    const advItems = [
      { label: "PROM/DÍA", value: `${adv.avgTicketsPerDay}`, color: AMBER },
      { label: "HORA PICO", value: `${String(adv.peakHour).padStart(2, "0")}:00`, color: AMBER },
      { label: "DÍA TOP", value: adv.busiestDay, color: GREEN },
      { label: "PROM/HANDLER", value: `${adv.avgPerHandler}`, color: TEXT },
    ];
    const advColW = leftW / 4;
    advItems.forEach((item, i) => {
      const ax = leftX + i * advColW + 18;
      text(ctx, item.label, ax, advY + 12, TEXT_DIM, 9, { weight: 600 });
      text(ctx, item.value, ax, advY + 30, item.color, 20, { weight: 700 });
      // Vertical divider
      if (i < 3) {
        ctx.fillStyle = CARD_BORDER;
        ctx.fillRect(leftX + (i + 1) * advColW, advY + 14, 1, advH - 28);
      }
    });
    advY += advH + 10;
  }

  // Hourly chart
  text(ctx, "DISTRIBUCIÓN POR HORA", leftX, advY, TEXT_DIM, 10, { weight: 700 });
  advY += 16;
  const hourlyH = 180;
  roundRect(ctx, leftX, advY, leftW, hourlyH, 12, CARD_BG, CARD_BORDER);

  // Peak badge
  if (peakHour) {
    const peakLabel = `Pico: ${String(peakHour.hour).padStart(2, "0")}:00 (${peakHour.count})`;
    const pBadgeW = ctx.measureText(peakLabel).width + 20;
    roundRect(ctx, leftX + leftW - pBadgeW - 14, advY + 8, pBadgeW, 20, 5, "rgba(255,172,0,0.1)", "rgba(255,172,0,0.2)");
    text(ctx, peakLabel, leftX + leftW - pBadgeW / 2 - 4, advY + 12, AMBER_DIM, 10, { weight: 500, align: "center" });
  }

  const hChartTop = advY + 34;
  const hChartH = hourlyH - 50;
  const hBarW = (leftW - 40) / 24;
  for (let i = 0; i < 24; i++) {
    const bucket = data.hourly[i];
    const count = bucket ? bucket.count : 0;
    const pct = maxHourly > 0 ? count / maxHourly : 0;
    const barH = Math.max(pct * hChartH, 1);
    const bx = leftX + 16 + i * hBarW;
    const by = hChartTop + hChartH - barH;
    const isPeak = peakHour && i === peakHour.hour;

    if (count > 0) {
      // Gradient bar
      const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
      barGrad.addColorStop(0, isPeak ? AMBER : "rgba(255,172,0,0.7)");
      barGrad.addColorStop(1, isPeak ? AMBER_DIM : "rgba(255,172,0,0.3)");
      roundRect(ctx, bx, by, hBarW - 3, barH, 2, undefined);
      ctx.fillStyle = barGrad;
      ctx.fill();
    } else {
      roundRect(ctx, bx, by, hBarW - 3, 1, 0, "#1a1a1a");
    }
  }
  // Hour labels
  [0, 4, 8, 12, 16, 20, 23].forEach((h) => {
    const lx = leftX + 16 + h * hBarW + (hBarW - 3) / 2;
    text(ctx, String(h).padStart(2, "0"), lx, advY + hourlyH - 12, TEXT_DIM, 9, { align: "center" });
  });
  advY += hourlyH + 10;

  // Weekday chart
  text(ctx, "ACTIVIDAD SEMANAL", leftX, advY, TEXT_DIM, 11, { weight: 700 });
  advY += 20;
  const wkH = colY + colH - advY;
  roundRect(ctx, leftX, advY, leftW, wkH, 12, CARD_BG, CARD_BORDER);

  // Peak day badge
  if (peakDay) {
    const pdLabel = `Top: ${peakDay.dayName} (${peakDay.count})`;
    const pdBadgeW = ctx.measureText(pdLabel).width + 24;
    roundRect(ctx, leftX + leftW - pdBadgeW - 14, advY + 8, pdBadgeW, 22, 6, "rgba(34,197,94,0.1)", "rgba(34,197,94,0.2)");
    text(ctx, pdLabel, leftX + leftW - pdBadgeW / 2 - 4, advY + 14, GREEN, 11, { weight: 500, align: "center" });
  }

  const wBarAreaY = advY + 40;
  const wBarAreaH = wkH - 64;
  const wBarW = (leftW - 40) / 7;
  data.weekday.forEach((d, i) => {
    const pct = maxWeekday > 0 ? d.count / maxWeekday : 0;
    const barH = Math.max(pct * wBarAreaH, 1);
    const bx = leftX + 16 + i * wBarW + wBarW * 0.1;
    const bw = wBarW * 0.8;
    const by = wBarAreaY + wBarAreaH - barH;
    const isPeak = peakDay && d.dayName === peakDay.dayName;

    if (d.count > 0) {
      const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
      barGrad.addColorStop(0, isPeak ? GREEN : "rgba(34,197,94,0.6)");
      barGrad.addColorStop(1, isPeak ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.15)");
      roundRect(ctx, bx, by, bw, barH, 4, undefined);
      ctx.fillStyle = barGrad;
      ctx.fill();
    }

    // Count on top of bar
    if (d.count > 0) {
      text(ctx, String(d.count), bx + bw / 2, by - 18, isPeak ? GREEN : TEXT_DIM, 11, { weight: 600, align: "center" });
    }

    text(ctx, d.dayName.slice(0, 3), bx + bw / 2, advY + wkH - 18, TEXT_DIM, 11, { weight: 500, align: "center" });
  });

  // ══════════════════════════════════════════════════════════
  // CENTER COLUMN — Leaderboard
  // ══════════════════════════════════════════════════════════

  text(ctx, "LEADERBOARD", centerX, colY - 2, TEXT_DIM, 11, { weight: 700 });
  const clGrad = ctx.createLinearGradient(centerX, 0, centerX + centerW, 0);
  clGrad.addColorStop(0, "rgba(255,172,0,0.3)");
  clGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = clGrad;
  ctx.fillRect(centerX, colY + 12, centerW, 1);

  const lbCardY = colY + 22;
  roundRect(ctx, centerX, lbCardY, centerW, colH - 22, 12, CARD_BG, CARD_BORDER);

  // Trophy icon area
  title(ctx, "HANDLERS", centerX + 20, lbCardY + 18, TEXT_SEC, 17);
  text(ctx, `${handlers.length} participantes`, centerX + centerW - 20, lbCardY + 22, TEXT_DIM, 12, { align: "right" });

  // Separator
  ctx.fillStyle = CARD_BORDER;
  ctx.fillRect(centerX + 16, lbCardY + 48, centerW - 32, 1);

  const lbY = lbCardY + 60;
  const availH = colH - 22 - 60 - 16;
  const rowH = Math.min(44, availH / Math.max(handlers.length, 1));

  handlers.forEach((h, i) => {
    const ry = lbY + i * rowH;

    // Top 3 highlight
    if (i < 3) {
      const hlAlpha = i === 0 ? 0.08 : 0.04;
      roundRect(ctx, centerX + 10, ry - 1, centerW - 20, rowH - 2, 8, `rgba(255,172,0,${hlAlpha})`);
    }

    // Rank number
    const rankW = 28;
    if (i === 0) {
      // Gold circle
      ctx.beginPath();
      ctx.arc(centerX + 30, ry + rowH / 2 - 1, 13, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,172,0,0.15)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,172,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      text(ctx, "1", centerX + 30, ry + rowH / 2 - 8, AMBER, 15, { weight: 800, align: "center" });
    } else if (i === 1) {
      ctx.beginPath();
      ctx.arc(centerX + 30, ry + rowH / 2 - 1, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168,162,158,0.1)";
      ctx.fill();
      text(ctx, "2", centerX + 30, ry + rowH / 2 - 8, "#a8a29e", 14, { weight: 700, align: "center" });
    } else if (i === 2) {
      ctx.beginPath();
      ctx.arc(centerX + 30, ry + rowH / 2 - 1, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(217,119,6,0.1)";
      ctx.fill();
      text(ctx, "3", centerX + 30, ry + rowH / 2 - 8, "#d97706", 14, { weight: 700, align: "center" });
    } else {
      text(ctx, `${i + 1}`, centerX + 30, ry + rowH / 2 - 7, TEXT_DIM, 13, { weight: 600, align: "center" });
    }

    // Name
    const nameX = centerX + 54;
    text(ctx, h.handler, nameX, ry + rowH / 2 - 8, i < 3 ? TEXT : TEXT_SEC, 15, {
      weight: i < 3 ? 600 : 400,
      maxW: centerW - 300,
    });

    // Progress bar
    const barX = centerX + centerW - 230;
    const barW = 130;
    const bH = 6;
    const bY = ry + rowH / 2 - 3;
    roundRect(ctx, barX, bY, barW, bH, 3, "#1a1a1a");
    const fillW = Math.max((h.ticketsHandled / maxHandler) * barW, 2);
    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    if (i === 0) {
      barGrad.addColorStop(0, AMBER_DIM);
      barGrad.addColorStop(1, AMBER);
    } else if (i < 3) {
      barGrad.addColorStop(0, "rgba(255,172,0,0.4)");
      barGrad.addColorStop(1, "rgba(255,172,0,0.7)");
    } else {
      barGrad.addColorStop(0, "rgba(255,172,0,0.15)");
      barGrad.addColorStop(1, "rgba(255,172,0,0.35)");
    }
    roundRect(ctx, barX, bY, fillW, bH, 3, undefined);
    ctx.fillStyle = barGrad;
    ctx.fill();

    // Count + percentage
    text(ctx, String(h.ticketsHandled), centerX + centerW - 76, ry + rowH / 2 - 9, i < 3 ? AMBER : TEXT_SEC, 16, { weight: 700, align: "right" });
    text(ctx, `${h.percentage}%`, centerX + centerW - 20, ry + rowH / 2 - 7, TEXT_DIM, 12, { weight: 400, align: "right" });
  });

  if (data.handlers.length > 15) {
    text(ctx, `+ ${data.handlers.length - 15} más`, centerX + centerW / 2, lbY + handlers.length * rowH + 8, TEXT_DIM, 13, { weight: 500, align: "center" });
  }

  // ══════════════════════════════════════════════════════════
  // RIGHT COLUMN — Donut + Stats + Highlights
  // ══════════════════════════════════════════════════════════

  text(ctx, "ANÁLISIS", rightX, colY - 2, TEXT_DIM, 11, { weight: 700 });
  const rlGrad = ctx.createLinearGradient(rightX, 0, rightX + rightW, 0);
  rlGrad.addColorStop(0, "rgba(255,172,0,0.3)");
  rlGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = rlGrad;
  ctx.fillRect(rightX, colY + 12, rightW, 1);

  // Donut card
  const donutCardH = 240;
  const donutCardY = colY + 22;
  roundRect(ctx, rightX, donutCardY, rightW, donutCardH, 14, CARD_BG, CARD_BORDER);

  text(ctx, "TASA DE RESPUESTA", rightX + rightW / 2, donutCardY + 16, TEXT_DIM, 10, { weight: 600, align: "center" });

  const dcx = rightX + rightW / 2;
  const dcy = donutCardY + 132;
  const midR = 65;
  const ringW = 16;

  // Donut glow
  drawGlow(ctx, dcx, dcy, 100, "rgb(34,197,94)", 0.08);

  // Background ring
  ctx.beginPath();
  ctx.arc(dcx, dcy, midR, 0, Math.PI * 2);
  ctx.lineWidth = ringW;
  ctx.strokeStyle = "#1a1212";
  ctx.stroke();

  // Responded arc (gradient stroke via multiple segments)
  const angle = (ov.responseRate / 100) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(dcx, dcy, midR, -Math.PI / 2, -Math.PI / 2 + angle);
  ctx.lineWidth = ringW;
  ctx.strokeStyle = rateColor;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";

  // Center text
  title(ctx, `${ov.responseRate}%`, dcx, dcy - 20, rateColor, 36, "center");
  text(ctx, `${ov.respondedTickets} / ${ov.totalTickets}`, dcx, dcy + 22, TEXT_DIM, 12, { weight: 500, align: "center" });

  // Legend dots
  const legY = donutCardY + donutCardH - 28;
  ctx.beginPath(); ctx.arc(rightX + rightW / 2 - 60, legY + 5, 4, 0, Math.PI * 2); ctx.fillStyle = GREEN; ctx.fill();
  text(ctx, "Respondidos", rightX + rightW / 2 - 50, legY, TEXT_DIM, 10);
  ctx.beginPath(); ctx.arc(rightX + rightW / 2 + 40, legY + 5, 4, 0, Math.PI * 2); ctx.fillStyle = RED; ctx.fill();
  text(ctx, "Pendientes", rightX + rightW / 2 + 50, legY, TEXT_DIM, 10);

  // Info cards
  let infoY = donutCardY + donutCardH + 10;
  if (adv) {
    const infos = [
      { label: "HORA PICO", value: `${String(adv.peakHour).padStart(2, "0")}:00`, sub: `${adv.peakHourCount} tickets`, accent: AMBER },
      { label: "DÍA MÁS ACTIVO", value: adv.busiestDay, sub: `${adv.busiestDayCount} tickets`, accent: GREEN },
      { label: "USUARIOS ÚNICOS", value: `${adv.uniqueUsers}`, sub: "personas", accent: TEXT },
      { label: "PROM/HANDLER", value: `${adv.avgPerHandler}`, sub: "tickets c/u", accent: AMBER },
    ];
    const infoCardH = 56;
    const infoGap = 8;
    const infoColW = (rightW - infoGap) / 2;
    infos.forEach((info, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ix = rightX + col * (infoColW + infoGap);
      const iy = infoY + row * (infoCardH + infoGap);
      roundRect(ctx, ix, iy, infoColW, infoCardH, 10, CARD_BG, CARD_BORDER);
      text(ctx, info.label, ix + 12, iy + 8, TEXT_DIM, 8, { weight: 600 });
      text(ctx, info.value, ix + 12, iy + 22, info.accent, 18, { weight: 700 });
      text(ctx, info.sub, ix + 12, iy + 42, TEXT_DIM, 9);
    });
    infoY += 2 * (infoCardH + infoGap) + 4;
  }

  // Top handlers compact (right column)
  const topN = Math.min(5, handlers.length);
  const topCardH = colY + colH - infoY;
  if (topCardH > 60 && topN > 0) {
    roundRect(ctx, rightX, infoY, rightW, topCardH, 12, CARD_BG, CARD_BORDER);
    text(ctx, "TOP HANDLERS", rightX + 16, infoY + 14, TEXT_DIM, 10, { weight: 600 });

    const tRowH = Math.min(32, (topCardH - 44) / topN);
    const tStartY = infoY + 38;
    handlers.slice(0, topN).forEach((h, i) => {
      const ry = tStartY + i * tRowH;
      const rankColors = [AMBER, "#a8a29e", "#d97706", TEXT_DIM, TEXT_DIM];
      text(ctx, `${i + 1}`, rightX + 24, ry, rankColors[i], 13, { weight: 700, align: "center" });
      text(ctx, h.handler, rightX + 40, ry, TEXT, 13, { weight: i < 3 ? 600 : 400, maxW: rightW - 110 });
      text(ctx, String(h.ticketsHandled), rightX + rightW - 16, ry, AMBER, 13, { weight: 700, align: "right" });
    });
  }

  // ══════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════

  const footY = H - 32;
  text(ctx, "SUPPORT TRACKER", PAD, footY, TEXT_DIM, 11, { weight: 600 });
  text(ctx, "·", PAD + 118, footY, "rgba(255,172,0,0.3)", 11);
  text(ctx, "GTA WORLD", PAD + 130, footY, TEXT_DIM, 11);

  // Generated timestamp
  text(ctx, `Generado: ${new Date().toLocaleString("es-AR")}`, W - PAD, footY, TEXT_DIM, 10, { weight: 400, align: "right" });

  // ── Export ──
  canvas.toBlob((blob) => {
    if (blob) {
      saveAs(blob, `soporte-${data.from}-${data.to}-discord.png`);
    }
  }, "image/png");
}
