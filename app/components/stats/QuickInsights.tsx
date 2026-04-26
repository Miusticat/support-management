"use client";

import { Lightbulb } from "lucide-react";
import type {
  OverviewStats,
  HandlerStat,
  HourlyBucket,
  DayOfWeekBucket,
  AdvancedStats,
  TopUser,
} from "@/lib/stats/types";

interface Props {
  overview: OverviewStats | null;
  handlers: HandlerStat[];
  hourly: HourlyBucket[];
  weekday: DayOfWeekBucket[];
  advanced: AdvancedStats | null;
  topUsers: TopUser[];
}

const HOUR_LABELS: Record<number, string> = {
  0: "00:00",
  1: "01:00",
  2: "02:00",
  3: "03:00",
  4: "04:00",
  5: "05:00",
  6: "06:00",
  7: "07:00",
  8: "08:00",
  9: "09:00",
  10: "10:00",
  11: "11:00",
  12: "12:00",
  13: "13:00",
  14: "14:00",
  15: "15:00",
  16: "16:00",
  17: "17:00",
  18: "18:00",
  19: "19:00",
  20: "20:00",
  21: "21:00",
  22: "22:00",
  23: "23:00",
};

function buildInsights(props: Props): string[] {
  const { overview, handlers, hourly, weekday, advanced, topUsers } = props;
  const insights: string[] = [];

  if (!overview || overview.totalTickets === 0) return insights;

  // Top handler
  if (handlers.length > 0) {
    const top = handlers[0];
    insights.push(
      `🏆 El handler más activo fue ${top.handler} con ${top.ticketsHandled} tickets (${top.percentage.toFixed(1)}% del total).`
    );
  }

  // Handler count context
  if (overview.uniqueHandlers > 0) {
    const avg = Math.round(overview.totalTickets / overview.uniqueHandlers);
    insights.push(
      `👥 ${overview.uniqueHandlers} handlers participaron, con un promedio de ~${avg} tickets cada uno.`
    );
  }

  // Response rate
  if (overview.responseRate >= 95) {
    insights.push(
      `✅ Excelente tasa de respuesta: ${overview.responseRate.toFixed(1)}%. Casi todos los tickets fueron atendidos.`
    );
  } else if (overview.responseRate >= 80) {
    insights.push(
      `📊 Buena tasa de respuesta: ${overview.responseRate.toFixed(1)}%. ${overview.unrespondedTickets} tickets quedaron sin atender.`
    );
  } else if (overview.responseRate > 0) {
    insights.push(
      `⚠️ La tasa de respuesta fue ${overview.responseRate.toFixed(1)}%. Hay ${overview.unrespondedTickets} tickets sin responder — podría mejorarse.`
    );
  }

  // Peak hour
  if (hourly.length > 0) {
    const peak = hourly.reduce((a, b) => (b.count > a.count ? b : a));
    if (peak.count > 0) {
      insights.push(
        `⏰ La hora más activa fue ${HOUR_LABELS[peak.hour]} con ${peak.count} tickets.`
      );
    }

    // Quiet hours
    const quiet = hourly.filter((h) => h.count === 0);
    if (quiet.length > 0 && quiet.length <= 8) {
      const ranges = compactHourRanges(quiet.map((h) => h.hour));
      insights.push(`🌙 Horas sin actividad: ${ranges}.`);
    }
  }

  // Busiest day
  if (weekday.length > 0) {
    const busiest = weekday.reduce((a, b) => (b.count > a.count ? b : a));
    const quietest = weekday.reduce((a, b) => (b.count < a.count ? b : a));
    if (busiest.count > 0) {
      insights.push(
        `📅 El día más ocupado fue ${busiest.dayName} (${busiest.count} tickets) y el más tranquilo ${quietest.dayName} (${quietest.count}).`
      );
    }
  }

  // Top repeat user
  if (topUsers.length > 0) {
    const top = topUsers[0];
    if (top.ticketCount >= 3) {
      insights.push(
        `🔁 El usuario más frecuente fue ${top.username} (${top.character}) con ${top.ticketCount} tickets.`
      );
    }
  }

  // Handler concentration
  if (handlers.length >= 3) {
    const topThreeShare = handlers
      .slice(0, 3)
      .reduce((s, h) => s + h.percentage, 0);
    if (topThreeShare >= 70) {
      insights.push(
        `📌 Los 3 handlers principales manejaron el ${topThreeShare.toFixed(0)}% del volumen total — alta concentración.`
      );
    }
  }

  // Advanced stats
  if (advanced) {
    if (advanced.avgTicketsPerDay >= 50) {
      insights.push(
        `🔥 Alto volumen: ~${advanced.avgTicketsPerDay.toFixed(0)} tickets por día en promedio.`
      );
    } else if (advanced.avgTicketsPerDay >= 20) {
      insights.push(
        `📈 Volumen moderado: ~${advanced.avgTicketsPerDay.toFixed(0)} tickets por día en promedio.`
      );
    }
  }

  return insights;
}

function compactHourRanges(hours: number[]): string {
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(
        start === end
          ? HOUR_LABELS[start]
          : `${HOUR_LABELS[start]}-${HOUR_LABELS[end]}`
      );
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(
    start === end
      ? HOUR_LABELS[start]
      : `${HOUR_LABELS[start]}-${HOUR_LABELS[end]}`
  );

  return ranges.join(", ");
}

export function QuickInsights(props: Props) {
  const insights = buildInsights(props);

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber/15">
          <Lightbulb className="h-3.5 w-3.5 text-amber" />
        </div>
        <h3 className="text-sm font-semibold">Análisis rápido</h3>
        <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] text-text-secondary">
          {insights.length}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((text, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/50 bg-background/50 px-3.5 py-2.5 text-[13px] leading-relaxed text-text-secondary"
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}
