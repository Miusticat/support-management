"use client";

import { Shield, Crown } from "lucide-react";

interface HandlerStatsToggleProps {
  showOnlySupport: boolean;
  onToggle: (showOnlySupport: boolean) => void;
}

export function HandlerStatsToggle({ showOnlySupport, onToggle }: HandlerStatsToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1">
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          !showOnlySupport
            ? "bg-amber/10 text-amber"
            : "text-text-secondary hover:text-text-foreground"
        }`}
      >
        <Crown className="h-4 w-4" />
        Todos
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          showOnlySupport
            ? "bg-amber/10 text-amber"
            : "text-text-secondary hover:text-text-foreground"
        }`}
      >
        <Shield className="h-4 w-4" />
        Support's
      </button>
    </div>
  );
}
