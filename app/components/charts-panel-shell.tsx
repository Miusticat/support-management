"use client";

import dynamic from "next/dynamic";

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

type ChartsPanelShellProps = {
  activityData: ActivityPoint[];
  activityTitle: string;
  activitySubtitle: string;
  activityBadge?: string;
  showcaseTitle: string;
  showcaseSubtitle: string;
  supportShowcase: SupportShowcasePoint[];
};

const ChartsPanel = dynamic(
  () => import("@/app/components/charts-panel").then((mod) => mod.ChartsPanel),
  { ssr: false }
);

export function ChartsPanelShell(props: ChartsPanelShellProps) {
  return <ChartsPanel {...props} />;
}
