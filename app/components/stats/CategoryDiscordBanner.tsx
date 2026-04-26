"use client";

import { saveAs } from "file-saver";

export interface CategoryBannerData {
  from: string;
  to: string;
  categories: Array<{
    categoryId: number;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    totalTickets: number;
    respondedTickets: number;
    unrespondedTickets: number;
    responseRate: number;
    topHandlers: Array<{
      handler: string;
      ticketCount: number;
      percentage: number;
    }>;
  }>;
  uncategorizedCount: number;
  supportOnly?: boolean;
}

const W = 1920;
const H = 1080;
const PAD = 48;

// Colors
const BG = "#07080a";
const AMBER = "#ffac00";
const AMBER_DIM = "#b37800";
const GREEN = "#22c55e";
const RED = "#ef4444";
const YELLOW = "#eab308";
const TEXT = "#f0f0f0";
const TEXT_SEC = "#9ca3af";
const TEXT_DIM = "#555b66";
const CARD_BG = "#111318";
const CARD_BORDER = "#1c1f26";

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

function sectionTitle(
  ctx: CanvasRenderingContext2D,
  label: string, x: number, y: number, w: number
) {
  text(ctx, label, x, y, TEXT_DIM, 10, { weight: 700 });
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "rgba(255,172,0,0.3)");
  g.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y + 14, w, 1);
}

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, pct: number,
  color: string, bgColor = "#1a1a1a"
) {
  roundRect(ctx, x, y, w, h, h / 2, bgColor);
  if (pct > 0) {
    const barW = Math.max(h, w * Math.min(pct, 1));
    const g = ctx.createLinearGradient(x, 0, x + barW, 0);
    // Safely derive a semi-transparent version of the color
    const baseColor = color.length === 9 ? color.slice(0, 7) : color;
    g.addColorStop(0, color);
    g.addColorStop(1, baseColor + "80");
    roundRect(ctx, x, y, barW, h, h / 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

// ─── Main generator ──────────────────────────────────────

export async function generateDiscordBanner(data: CategoryBannerData): Promise<void> {
  await loadVersusFont();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const categories = [...data.categories]
    .sort((a, b) => b.totalTickets - a.totalTickets)
    .slice(0, 12);
  const totalTickets = categories.reduce((sum, cat) => sum + cat.totalTickets, 0) + data.uncategorizedCount;
  const totalResponded = categories.reduce((sum, cat) => sum + cat.respondedTickets, 0);
  const totalUnresponded = totalTickets - totalResponded;
  const overallResponseRate = totalTickets > 0 ? (totalResponded / totalTickets) * 100 : 0;
  const rateColor = overallResponseRate >= 80 ? GREEN : overallResponseRate >= 50 ? YELLOW : RED;
  const activeCategories = categories.filter(c => c.totalTickets > 0);

  // Collect global top handlers
  const handlerMap = new Map<string, number>();
  categories.forEach(cat => {
    (cat.topHandlers ?? []).forEach(h => {
      handlerMap.set(h.handler, (handlerMap.get(h.handler) || 0) + h.ticketCount);
    });
  });
  const globalTopHandlers = [...handlerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // ══════════════════════════════════════════════════════════
  // BACKGROUND
  // ══════════════════════════════════════════════════════════

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid pattern
  ctx.strokeStyle = "rgba(255,255,255,0.012)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 60) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 60) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // Radial glow spots
  drawGlow(ctx, 160, 80, 500, "rgb(255,172,0)", 0.06);
  drawGlow(ctx, W - 250, H - 150, 550, "rgb(255,140,0)", 0.035);
  drawGlow(ctx, W / 2, H / 2 - 100, 700, "rgb(255,172,0)", 0.018);
  if (data.supportOnly) {
    drawGlow(ctx, W - 200, 80, 300, "rgb(255,172,0)", 0.05);
  }

  // Noise
  for (let i = 0; i < 10000; i++) {
    const nx = Math.random() * W;
    const ny = Math.random() * H;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.012})`;
    ctx.fillRect(nx, ny, 1, 1);
  }

  // Top accent bar
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, "rgba(255,172,0,0)");
  topGrad.addColorStop(0.2, AMBER);
  topGrad.addColorStop(0.5, "#ff8c00");
  topGrad.addColorStop(0.8, AMBER);
  topGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 3);

  // Bottom accent bar
  const botGrad = ctx.createLinearGradient(0, 0, W, 0);
  botGrad.addColorStop(0, "rgba(255,172,0,0)");
  botGrad.addColorStop(0.3, "rgba(255,172,0,0.25)");
  botGrad.addColorStop(0.7, "rgba(255,140,0,0.25)");
  botGrad.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 2, W, 2);

  // ══════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════

  title(ctx, "CATEGORY ANALYSIS", PAD, PAD - 8, AMBER, 44);

  // Decorative line under title
  ctx.font = `400 44px "${FONT_TITLE}", ${FONT_BODY}`;
  const titleW = ctx.measureText("CATEGORY ANALYSIS").width || 380;
  const lineG = ctx.createLinearGradient(PAD, 0, PAD + titleW + 60, 0);
  lineG.addColorStop(0, AMBER);
  lineG.addColorStop(0.6, "rgba(255,140,0,0.4)");
  lineG.addColorStop(1, "rgba(255,172,0,0)");
  ctx.fillStyle = lineG;
  ctx.fillRect(PAD, PAD + 44, titleW + 60, 2);

  // Subtitle row
  text(ctx, "GTA WORLD SUPPORT", PAD, PAD + 54, TEXT_SEC, 13, { weight: 600 });

  // Date range badge
  const dateStr = `${data.from}  →  ${data.to}`;
  ctx.font = `500 12px ${FONT_BODY}`;
  const dateW = ctx.measureText(dateStr).width + 24;
  const dateBadgeX = PAD + 160;
  roundRect(ctx, dateBadgeX, PAD + 50, dateW, 22, 6, "rgba(255,172,0,0.08)", "rgba(255,172,0,0.2)");
  text(ctx, dateStr, dateBadgeX + 12, PAD + 54, AMBER_DIM, 12, { weight: 500 });

  // Support-only badge
  if (data.supportOnly) {
    const soLabel = "SOLO SUPPORT'S";
    ctx.font = `700 11px ${FONT_BODY}`;
    const soW = ctx.measureText(soLabel).width + 28;
    const soX = dateBadgeX + dateW + 10;
    roundRect(ctx, soX, PAD + 50, soW, 22, 6, "rgba(255,172,0,0.12)", AMBER);
    text(ctx, soLabel, soX + 14, PAD + 55, AMBER, 11, { weight: 700 });
  }

  // ── Hero stats (top right) ──
  const heroBlockX = W - PAD - 520;
  const heroY = PAD - 4;

  // Response rate card
  const rrW = 170; const rrH = 72;
  const rrX = heroBlockX;
  roundRect(ctx, rrX, heroY, rrW, rrH, 12, CARD_BG, CARD_BORDER);
  drawGlow(ctx, rrX + rrW / 2, heroY + rrH / 2, 80, "rgb(255,172,0)", 0.05);
  text(ctx, "TASA RESPUESTA", rrX + rrW / 2, heroY + 10, TEXT_DIM, 9, { weight: 700, align: "center" });
  title(ctx, `${overallResponseRate.toFixed(1)}%`, rrX + rrW / 2, heroY + 26, rateColor, 34, "center");

  // Total tickets card
  const ttW = 170; const ttH = 72;
  const ttX = rrX + rrW + 10;
  roundRect(ctx, ttX, heroY, ttW, ttH, 12, CARD_BG, CARD_BORDER);
  text(ctx, "TOTAL TICKETS", ttX + ttW / 2, heroY + 10, TEXT_DIM, 9, { weight: 700, align: "center" });
  title(ctx, totalTickets.toLocaleString(), ttX + ttW / 2, heroY + 26, AMBER, 34, "center");

  // Responded / Unresponded card
  const ruW = 170; const ruH = 72;
  const ruX = ttX + ttW + 10;
  roundRect(ctx, ruX, heroY, ruW, ruH, 12, CARD_BG, CARD_BORDER);
  text(ctx, "RESPONDIDOS", ruX + 14, heroY + 10, TEXT_DIM, 9, { weight: 700 });
  text(ctx, totalResponded.toLocaleString(), ruX + 14, heroY + 26, GREEN, 20, { weight: 700 });
  text(ctx, "SIN RESPONDER", ruX + 14, heroY + 48, TEXT_DIM, 8, { weight: 600 });
  text(ctx, totalUnresponded.toLocaleString(), ruX + ruW - 14, heroY + 48, RED, 13, { weight: 700, align: "right" });
  text(ctx, totalResponded.toLocaleString(), ruX + ruW - 14, heroY + 24, GREEN, 13, { weight: 700, align: "right" });

  // ══════════════════════════════════════════════════════════
  // LAYOUT: 3 columns
  // ══════════════════════════════════════════════════════════

  const colY = PAD + 90;
  const colH = H - colY - 40;
  const gap = 16;
  const leftW = 580;
  const rightW = 380;
  const centerW = W - 2 * PAD - leftW - rightW - 2 * gap;
  const leftX = PAD;
  const centerX = leftX + leftW + gap;
  const rightX = centerX + centerW + gap;

  // ══════════════════════════════════════════════════════════
  // LEFT COLUMN — Category Breakdown
  // ══════════════════════════════════════════════════════════

  sectionTitle(ctx, "DESGLOSE POR CATEGORÍA", leftX, colY, leftW);

  const catStartY = colY + 24;
  const catCardH = colH - 24;
  roundRect(ctx, leftX, catStartY, leftW, catCardH, 12, CARD_BG, CARD_BORDER);

  // Table header
  const thY = catStartY + 14;
  text(ctx, "#", leftX + 14, thY, TEXT_DIM, 9, { weight: 700 });
  text(ctx, "CATEGORÍA", leftX + 34, thY, TEXT_DIM, 9, { weight: 700 });
  text(ctx, "TICKETS", leftX + 280, thY, TEXT_DIM, 9, { weight: 700, align: "right" });
  text(ctx, "RESPOND.", leftX + 360, thY, TEXT_DIM, 9, { weight: 700, align: "right" });
  text(ctx, "TASA", leftX + 420, thY, TEXT_DIM, 9, { weight: 700, align: "right" });
  text(ctx, "BARRA", leftX + leftW - 18, thY, TEXT_DIM, 9, { weight: 700, align: "right" });

  // Separator
  ctx.fillStyle = CARD_BORDER;
  ctx.fillRect(leftX + 12, thY + 16, leftW - 24, 1);

  const maxCatTickets = Math.max(...categories.map(c => c.totalTickets), 1);
  const rowH = Math.min(52, (catCardH - 50) / Math.max(categories.length, 1));

  categories.forEach((cat, i) => {
    const ry = thY + 24 + i * rowH;
    if (ry + rowH > catStartY + catCardH - 8) return;

    // Subtle row hover bg for alternating
    if (i % 2 === 0) {
      roundRect(ctx, leftX + 4, ry - 4, leftW - 8, rowH, 6, "rgba(255,255,255,0.01)");
    }

    // Rank number
    const rankColor = i === 0 ? AMBER : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : TEXT_DIM;
    text(ctx, `${i + 1}`, leftX + 20, ry + 2, rankColor, 13, { weight: 700, align: "center" });

    // Color dot + name
    ctx.beginPath();
    ctx.arc(leftX + 38, ry + 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = cat.categoryColor || "#6b7280";
    ctx.fill();

    text(ctx, cat.categoryName, leftX + 50, ry, TEXT, 14, {
      weight: i < 3 ? 600 : 400,
      maxW: 210,
    });

    // Top handler for this category (small)
    const topH = (cat.topHandlers ?? [])[0];
    if (topH) {
      text(ctx, topH.handler, leftX + 50, ry + 18, TEXT_DIM, 10, { maxW: 160 });
    }

    // Stats
    text(ctx, `${cat.totalTickets}`, leftX + 280, ry + 4, TEXT, 14, { weight: 700, align: "right" });
    text(ctx, `${cat.respondedTickets}`, leftX + 360, ry + 4, GREEN, 13, { weight: 600, align: "right" });

    const rc = cat.responseRate >= 80 ? GREEN : cat.responseRate >= 50 ? YELLOW : RED;
    text(ctx, `${cat.responseRate}%`, leftX + 420, ry + 4, rc, 13, { weight: 700, align: "right" });

    // Progress bar
    const barX = leftX + 432;
    const barMaxW = leftW - 432 - 18;
    drawProgressBar(ctx, barX, ry + 6, barMaxW, 8, cat.totalTickets / maxCatTickets, cat.categoryColor || AMBER);
  });

  // Uncategorized row at bottom
  if (data.uncategorizedCount > 0) {
    const uncY = thY + 24 + categories.length * rowH + 4;
    if (uncY + 20 < catStartY + catCardH) {
      ctx.fillStyle = CARD_BORDER;
      ctx.fillRect(leftX + 12, uncY - 6, leftW - 24, 1);
      text(ctx, "—", leftX + 20, uncY + 2, TEXT_DIM, 13, { weight: 700, align: "center" });
      text(ctx, "Sin categorizar", leftX + 50, uncY, YELLOW, 13, { weight: 500 });
      text(ctx, `${data.uncategorizedCount}`, leftX + 280, uncY + 2, YELLOW, 14, { weight: 700, align: "right" });
    }
  }

  // ══════════════════════════════════════════════════════════
  // CENTER COLUMN — Distribution Chart + Performance Ranking
  // ══════════════════════════════════════════════════════════

  sectionTitle(ctx, "DISTRIBUCIÓN DE TICKETS", centerX, colY, centerW);

  const chartStartY = colY + 24;
  const pieH = Math.floor((colH - 36) * 0.55);
  roundRect(ctx, centerX, chartStartY, centerW, pieH, 12, CARD_BG, CARD_BORDER);

  // Donut chart
  const pieCx = centerX + centerW * 0.38;
  const pieCy = chartStartY + pieH / 2;
  const outerR = Math.min(pieH / 2 - 30, 110);
  const innerR = outerR * 0.52;

  let angle = -Math.PI / 2;
  const catTicketTotal = categories.reduce((s, c) => s + c.totalTickets, 0);

  activeCategories.forEach((cat) => {
    const sliceAngle = (cat.totalTickets / (catTicketTotal || 1)) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(pieCx, pieCy, outerR, angle, angle + sliceAngle);
    ctx.arc(pieCx, pieCy, innerR, angle + sliceAngle, angle, true);
    ctx.closePath();
    ctx.fillStyle = cat.categoryColor || "#6b7280";
    ctx.fill();
    // Segment gap
    ctx.strokeStyle = CARD_BG;
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += sliceAngle;
  });

  // Center label
  text(ctx, "TOTAL", pieCx, pieCy - 14, TEXT_DIM, 10, { weight: 600, align: "center" });
  title(ctx, catTicketTotal.toLocaleString(), pieCx, pieCy + 2, AMBER, 24, "center");

  // Legend (right side of pie)
  const legendX = centerX + centerW * 0.62;
  const legendMaxW = centerW * 0.38 - 20;
  const legendItemH = Math.min(22, (pieH - 30) / Math.max(activeCategories.length, 1));

  activeCategories.slice(0, Math.floor((pieH - 30) / legendItemH)).forEach((cat, i) => {
    const ly = chartStartY + 16 + i * legendItemH;
    ctx.beginPath();
    ctx.arc(legendX, ly + 7, 4, 0, Math.PI * 2);
    ctx.fillStyle = cat.categoryColor || "#6b7280";
    ctx.fill();
    text(ctx, cat.categoryName, legendX + 12, ly, TEXT, 12, { maxW: legendMaxW - 60 });
    const pct = catTicketTotal > 0 ? ((cat.totalTickets / catTicketTotal) * 100).toFixed(1) : "0";
    text(ctx, `${pct}%`, legendX + legendMaxW, ly, TEXT_SEC, 11, { align: "right" });
  });

  // ── Performance ranking (below pie) ──
  const perfStartY = chartStartY + pieH + 12;
  const perfH = colH - 24 - pieH - 12;
  sectionTitle(ctx, "RANKING DE RENDIMIENTO", centerX, perfStartY - 16, centerW);
  roundRect(ctx, centerX, perfStartY, centerW, perfH, 12, CARD_BG, CARD_BORDER);

  const sortedByRate = [...activeCategories].sort((a, b) => b.responseRate - a.responseRate);
  const perfRowH = Math.min(42, (perfH - 20) / Math.max(sortedByRate.length, 1));
  const medalColors = [AMBER, "#c0c0c0", "#cd7f32"];

  sortedByRate.slice(0, Math.floor((perfH - 20) / perfRowH)).forEach((cat, i) => {
    const ry = perfStartY + 14 + i * perfRowH;

    // Medal or rank
    if (i < 3) {
      ctx.beginPath();
      ctx.arc(centerX + 22, ry + perfRowH / 2 - 4, 11, 0, Math.PI * 2);
      ctx.fillStyle = medalColors[i] + "25";
      ctx.fill();
      text(ctx, `${i + 1}`, centerX + 22, ry + perfRowH / 2 - 12, medalColors[i], 12, { weight: 800, align: "center" });
    } else {
      text(ctx, `${i + 1}`, centerX + 22, ry + perfRowH / 2 - 12, TEXT_DIM, 11, { weight: 600, align: "center" });
    }

    // Color dot + name
    ctx.beginPath();
    ctx.arc(centerX + 42, ry + perfRowH / 2 - 4, 4, 0, Math.PI * 2);
    ctx.fillStyle = cat.categoryColor || "#6b7280";
    ctx.fill();

    text(ctx, cat.categoryName, centerX + 52, ry + perfRowH / 2 - 10, TEXT, 13, {
      weight: i < 3 ? 600 : 400,
      maxW: centerW - 190,
    });

    // Rate + tickets
    const rc = cat.responseRate >= 80 ? GREEN : cat.responseRate >= 50 ? YELLOW : RED;
    text(ctx, `${cat.responseRate}%`, centerX + centerW - 16, ry + perfRowH / 2 - 12, rc, 14, { weight: 700, align: "right" });
    text(ctx, `${cat.totalTickets} tks`, centerX + centerW - 16, ry + perfRowH / 2 + 4, TEXT_DIM, 10, { align: "right" });
  });

  // ══════════════════════════════════════════════════════════
  // RIGHT COLUMN — Global Top Handlers
  // ══════════════════════════════════════════════════════════

  sectionTitle(ctx, data.supportOnly ? "TOP SUPPORT'S" : "TOP HANDLERS GLOBAL", rightX, colY, rightW);

  const handlersStartY = colY + 24;
  const handlersH = Math.floor((colH - 36) * 0.65);
  roundRect(ctx, rightX, handlersStartY, rightW, handlersH, 12, CARD_BG, CARD_BORDER);

  const maxHandlerTickets = globalTopHandlers.length > 0 ? globalTopHandlers[0][1] : 1;
  const hRowH = Math.min(48, (handlersH - 30) / Math.max(globalTopHandlers.length, 1));

  globalTopHandlers.forEach(([handler, count], i) => {
    const ry = handlersStartY + 16 + i * hRowH;
    if (ry + hRowH > handlersStartY + handlersH - 4) return;

    // Rank medal
    if (i < 3) {
      ctx.beginPath();
      ctx.arc(rightX + 22, ry + hRowH / 2 - 2, 12, 0, Math.PI * 2);
      ctx.fillStyle = medalColors[i] + "20";
      ctx.fill();
      ctx.strokeStyle = medalColors[i] + "40";
      ctx.lineWidth = 1;
      ctx.stroke();
      text(ctx, `${i + 1}`, rightX + 22, ry + hRowH / 2 - 10, medalColors[i], 13, { weight: 800, align: "center" });
    } else {
      text(ctx, `${i + 1}`, rightX + 22, ry + hRowH / 2 - 8, TEXT_DIM, 12, { weight: 600, align: "center" });
    }

    // Name
    text(ctx, handler, rightX + 44, ry + 2, TEXT, 14, {
      weight: i < 3 ? 600 : 400,
      maxW: rightW - 120,
    });

    // Ticket count
    text(ctx, `${count} tickets`, rightX + rightW - 16, ry + 2, i < 3 ? AMBER : TEXT_SEC, 12, { weight: 600, align: "right" });

    // Progress bar
    const barY = ry + hRowH / 2 + 6;
    drawProgressBar(ctx, rightX + 44, barY, rightW - 76, 6, count / maxHandlerTickets, i < 3 ? AMBER : TEXT_DIM);

    // Percentage
    const handlerPct = totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(1) : "0";
    text(ctx, `${handlerPct}%`, rightX + rightW - 16, barY - 1, TEXT_DIM, 9, { align: "right" });
  });

  if (globalTopHandlers.length === 0) {
    text(ctx, "Sin datos de handlers", rightX + rightW / 2, handlersStartY + handlersH / 2 - 8, TEXT_DIM, 14, { align: "center" });
  }

  // ── Quick Stats (below handlers) ──
  const qsY = handlersStartY + handlersH + 12;
  const qsH = colH - 24 - handlersH - 12;
  sectionTitle(ctx, "RESUMEN RÁPIDO", rightX, qsY - 16, rightW);
  roundRect(ctx, rightX, qsY, rightW, qsH, 12, CARD_BG, CARD_BORDER);

  const quickStats = [
    { label: "Categorías activas", value: `${activeCategories.length} / ${categories.length}`, color: TEXT },
    { label: "Mejor categoría", value: activeCategories.length > 0 ? [...activeCategories].sort((a, b) => b.responseRate - a.responseRate)[0].categoryName : "—", color: GREEN },
    { label: "Más tickets", value: activeCategories.length > 0 ? activeCategories[0].categoryName : "—", color: AMBER },
    { label: "Handler #1", value: globalTopHandlers.length > 0 ? globalTopHandlers[0][0] : "—", color: AMBER },
  ];

  if (data.uncategorizedCount > 0) {
    quickStats.push({ label: "Sin categorizar", value: `${data.uncategorizedCount} tickets`, color: YELLOW });
  }

  const qsRowH = Math.min(36, (qsH - 16) / Math.max(quickStats.length, 1));
  quickStats.forEach((qs, i) => {
    const ry = qsY + 12 + i * qsRowH;
    if (ry + 20 > qsY + qsH) return;
    text(ctx, qs.label, rightX + 16, ry, TEXT_DIM, 11, { weight: 600 });
    text(ctx, qs.value, rightX + rightW - 16, ry, qs.color, 12, { weight: 600, align: "right", maxW: rightW / 2 - 10 });
  });

  // ══════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════

  const footY = H - 30;

  // Left: branding
  text(ctx, "CATEGORY TRACKER", PAD, footY, TEXT_DIM, 10, { weight: 600 });
  text(ctx, "·", PAD + 130, footY, "rgba(255,172,0,0.3)", 10);
  text(ctx, "GTA WORLD SUPPORT", PAD + 142, footY, TEXT_DIM, 10);

  if (data.supportOnly) {
    text(ctx, "·", PAD + 290, footY, "rgba(255,172,0,0.3)", 10);
    text(ctx, "SOLO SUPPORT'S", PAD + 302, footY, AMBER_DIM, 10, { weight: 600 });
  }

  // Right: timestamp
  text(ctx, `Generado: ${new Date().toLocaleString("es-AR")}`, W - PAD, footY, TEXT_DIM, 10, { weight: 400, align: "right" });

  // ── Export ──
  canvas.toBlob((blob) => {
    if (blob) {
      const suffix = data.supportOnly ? "-support" : "";
      saveAs(blob, `categories-${data.from}-${data.to}${suffix}-discord.png`);
    }
  }, "image/png");
}
