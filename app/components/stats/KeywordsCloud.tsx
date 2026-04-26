"use client";

import type { KeywordStat } from "@/lib/stats/types";
import { MessageSquareText } from "lucide-react";

interface Props {
  data: KeywordStat[];
}

export function KeywordsCloud({ data }: Props) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-4 text-sm font-medium text-text-secondary">
          Temas Frecuentes
        </h3>
        <p className="py-6 text-center text-sm text-text-secondary">
          Sin datos
        </p>
      </div>
    );
  }

  const maxCount = data[0].count;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-text-secondary" />
        <h3 className="text-sm font-medium text-text-secondary">
          Palabras Frecuentes en Consultas
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.slice(0, 20).map((k) => {
          const intensity = Math.max(0.3, k.count / maxCount);
          return (
            <span
              key={k.word}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-sm transition-colors hover:border-amber/30"
              style={{ opacity: 0.5 + intensity * 0.5 }}
            >
              <span>{k.word}</span>
              <span className="text-xs text-text-secondary">({k.count})</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
