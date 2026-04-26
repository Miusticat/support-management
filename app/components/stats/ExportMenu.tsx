"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
  Trophy,
  ListChecks,
  MonitorPlay,
} from "lucide-react";
import { cn } from "@/lib/stats/utils";

interface Props {
  onExportImage: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onExportDiscordBanner: () => void;
  onExportDiscord: (mode: "full" | "summary" | "leaderboard") => void;
  onCopyDiscord: (mode: "full" | "summary" | "leaderboard") => void;
  exporting: boolean;
}

export function ExportMenu({
  onExportImage,
  onExportPdf,
  onExportCsv,
  onExportDiscordBanner,
  onExportDiscord,
  onCopyDiscord,
  exporting,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleCopyDiscord(mode: "full" | "summary" | "leaderboard") {
    onCopyDiscord(mode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  }

  type MenuItem = { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; separator?: false } | { separator: true };

  const items: MenuItem[] = [
    {
      label: "Exportar como imagen",
      icon: ImageIcon,
      onClick: () => {
        onExportImage();
        setOpen(false);
      },
    },
    {
      label: "Exportar como PDF",
      icon: FileText,
      onClick: () => {
        onExportPdf();
        setOpen(false);
      },
    },
    {
      label: "Exportar como CSV",
      icon: FileSpreadsheet,
      onClick: () => {
        onExportCsv();
        setOpen(false);
      },
    },
    {
      label: "Discord — Banner imagen",
      icon: MonitorPlay,
      onClick: () => {
        onExportDiscordBanner();
        setOpen(false);
      },
    },
    { separator: true },
    {
      label: "Discord — Reporte completo",
      icon: MessageSquare,
      onClick: () => {
        onExportDiscord("full");
        setOpen(false);
      },
    },
    {
      label: "Discord — Resumen",
      icon: ListChecks,
      onClick: () => {
        onExportDiscord("summary");
        setOpen(false);
      },
    },
    {
      label: "Discord — Solo leaderboard",
      icon: Trophy,
      onClick: () => {
        onExportDiscord("leaderboard");
        setOpen(false);
      },
    },
    { separator: true },
    {
      label: copied ? "¡Copiado!" : "Copiar reporte completo",
      icon: copied ? Check : Copy,
      onClick: () => handleCopyDiscord("full"),
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors",
          exporting
            ? "opacity-50"
            : "text-text-secondary hover:bg-surface-hover"
        )}
      >
        <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
        Exportar
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          {items.map((item, idx) =>
            "separator" in item && item.separator ? (
              <div key={idx} className="my-1 border-t border-border" />
            ) : !("separator" in item) ? (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-hover"
              >
                <item.icon className="h-4 w-4 text-text-secondary" />
                {item.label}
              </button>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
