"use client";

import dynamic from "next/dynamic";

type ActivityPoint = {
  month: string;
  hours: number;
};

type ConsolePoint = {
  name: string;
  hours: number;
};

type ChartsPanelShellProps = {
  activityData: ActivityPoint[];
  consoleData: ConsolePoint[];
};

const ChartsPanel = dynamic(
  () => import("@/app/components/charts-panel").then((mod) => mod.ChartsPanel),
  { ssr: false }
);

export function ChartsPanelShell(props: ChartsPanelShellProps) {
  return <ChartsPanel {...props} />;
}
