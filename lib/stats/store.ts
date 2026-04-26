import { create } from "zustand";

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type Preset = "today" | "7days" | "30days" | "month" | "all" | "custom";

interface DashboardState {
  preset: Preset;
  from: string;
  to: string;
  groupBy: "day" | "week" | "month";
  handlerFilter: string | null;
  showOnlySupport: boolean;
  setPreset: (preset: Preset) => void;
  setCustomRange: (from: string, to: string) => void;
  setGroupBy: (groupBy: "day" | "week" | "month") => void;
  setHandlerFilter: (handler: string | null) => void;
  setShowOnlySupport: (showOnlySupport: boolean) => void;
}

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const tomorrow = tomorrowStr();
  switch (preset) {
    case "today":
      return { from: todayStr(), to: tomorrow };
    case "7days":
      return { from: daysAgo(6), to: tomorrow };
    case "30days":
      return { from: daysAgo(29), to: tomorrow };
    case "month": {
      const d = new Date();
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      return { from: first.toISOString().slice(0, 10), to: tomorrow };
    }
    case "all":
      return { from: "2000-01-01", to: "2100-01-01" };
    default:
      return { from: daysAgo(6), to: tomorrow };
  }
}

export const useDashboardStore = create<DashboardState>((set) => {
  const initial = rangeForPreset("7days");
  return {
    preset: "7days",
    from: initial.from,
    to: initial.to,
    groupBy: "day",
    handlerFilter: null,
    showOnlySupport: false,
    setPreset: (preset) => {
      const range = rangeForPreset(preset);
      set({ preset, ...range });
    },
    setCustomRange: (from, to) => {
      set({ preset: "custom", from, to });
    },
    setGroupBy: (groupBy) => set({ groupBy }),
    setHandlerFilter: (handler) => set({ handlerFilter: handler }),
    setShowOnlySupport: (showOnlySupport) => set({ showOnlySupport }),
  };
});
