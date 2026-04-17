"use client";

import {
  CartesianGrid,
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

type ChartsPanelProps = {
  activityData: ActivityPoint[];
  activityTitle: string;
  activitySubtitle: string;
  activityBadge?: string;
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
}: ChartsPanelProps) {
  return (
    <ChartCard
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
  );
}
