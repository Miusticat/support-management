"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/app/components/chart-card";

type ActivityPoint = {
  month: string;
  value: number;
};

type SupportShowcasePoint = {
  id: string;
  name: string;
  roleLabel: string;
  avatarUrl: string;
};

type ChartsPanelProps = {
  activityData: ActivityPoint[];
  activityTitle: string;
  activitySubtitle: string;
  activityBadge?: string;
  showcaseTitle: string;
  showcaseSubtitle: string;
  supportShowcase: SupportShowcasePoint[];
};

const tooltipStyle = {
  background: "rgba(13, 13, 13, 0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#e5e7eb",
};

export function ChartsPanel({
  activityData,
  activityTitle,
  activitySubtitle,
  activityBadge,
  showcaseTitle,
  showcaseSubtitle,
  supportShowcase,
}: ChartsPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (supportShowcase.length < 2) {
      return;
    }

    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % supportShowcase.length);
    }, 3500);

    return () => clearInterval(intervalId);
  }, [supportShowcase.length]);

  useEffect(() => {
    if (activeIndex >= supportShowcase.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, supportShowcase.length]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-7">
      <ChartCard
        className="xl:col-span-4"
        title={activityTitle}
        subtitle={activitySubtitle}
        badge={activityBadge}
      >
        <div className="h-70">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <defs>
                <linearGradient id="activityLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffac00" />
                  <stop offset="100%" stopColor="#e67e22" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#585858" tickLine={false} axisLine={false} />
              <YAxis stroke="#585858" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#activityLine)"
                strokeWidth={3}
                dot={{ stroke: "#ffd580", strokeWidth: 2, r: 4, fill: "#0d0d0d" }}
                activeDot={{ r: 6, fill: "#ffac00", stroke: "#0d0d0d", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        className="xl:col-span-3"
        title={showcaseTitle}
        subtitle={showcaseSubtitle}
      >
        <div className="relative h-70 overflow-hidden rounded-2xl border border-white/10 bg-(--surface-2)">
          {supportShowcase.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-(--muted)">
              No hay Support Lead/Trainer disponibles para mostrar en este momento.
            </div>
          ) : (
            <>
              {supportShowcase.map((support, index) => (
                <article
                  key={support.id}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 transition-all duration-700 ${
                    index === activeIndex
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-4 opacity-0"
                  }`}
                >
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#ffac00]/70 shadow-[0_0_30px_rgba(255,172,0,0.28)]">
                    <img
                      src={support.avatarUrl}
                      alt={`Avatar de ${support.name}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{support.name}</p>
                    <p className="text-sm uppercase tracking-[0.18em] text-[#ffac00]">
                      {support.roleLabel}
                    </p>
                  </div>
                </article>
              ))}

              {supportShowcase.length > 1 ? (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
                  {supportShowcase.map((support, index) => (
                    <span
                      key={`dot-${support.id}`}
                      className={`h-2 rounded-full transition-all duration-500 ${
                        index === activeIndex ? "w-6 bg-[#ffac00]" : "w-2 bg-white/35"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
