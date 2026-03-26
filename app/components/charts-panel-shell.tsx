"use client";

import dynamic from "next/dynamic";

type ActivityPoint = {
  month: string;
  value: number;
};

type BreakdownPoint = {
  name: string;
  value: number;
};

type ChartsPanelShellProps = {
  activityData: ActivityPoint[];
  breakdownData: BreakdownPoint[];
  activityTitle: string;
  activitySubtitle: string;
  activityBadge?: string;
  breakdownTitle: string;
  breakdownSubtitle: string;
};

const ChartsPanel = dynamic(
  () => import("@/app/components/charts-panel").then((mod) => mod.ChartsPanel),
  { ssr: false }
);

export function ChartsPanelShell(props: ChartsPanelShellProps) {
  return <ChartsPanel {...props} />;
}
