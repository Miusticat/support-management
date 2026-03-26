"use client";

import {
  Bar,
  BarChart,
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
  hours: number;
};

type ConsolePoint = {
  name: string;
  hours: number;
};

type ChartsPanelProps = {
  activityData: ActivityPoint[];
  consoleData: ConsolePoint[];
};

const tooltipStyle = {
  background: "rgba(8, 12, 32, 0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#f0f0ee",
};

export function ChartsPanel({ activityData, consoleData }: ChartsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-7">
      <ChartCard
        className="xl:col-span-4"
        title="Gaming Activity"
        subtitle="Hours played throughout the year"
        badge="+14%"
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <defs>
                <linearGradient id="activityLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38A5FF" />
                  <stop offset="100%" stopColor="#8C73F8" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#585858" tickLine={false} axisLine={false} />
              <YAxis stroke="#585858" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="url(#activityLine)"
                strokeWidth={3}
                dot={{ stroke: "#A6DDFF", strokeWidth: 2, r: 4, fill: "#0b1021" }}
                activeDot={{ r: 6, fill: "#8C73F8", stroke: "#0b1021", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        className="xl:col-span-3"
        title="Console Preferences"
        subtitle="Total hours by platform"
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consoleData}>
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7CFFB5" stopOpacity={0.95} />
                  <stop offset="95%" stopColor="#38A5FF" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="#585858" tickLine={false} axisLine={false} />
              <YAxis stroke="#585858" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="hours" fill="url(#barFill)" radius={[8, 8, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
