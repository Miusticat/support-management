"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDashboardStore } from "@/lib/stats/store";
import type {
  OverviewStats,
  HourlyBucket,
  HandlerStat,
  VolumeBucket,
  TicketRow,
  DayOfWeekBucket,
  TopUser,
  HandlerHourly,
  AdvancedStats,
} from "@/lib/stats/types";
import {
  exportAsImage,
  exportAsPdf,
  exportAsDiscordMarkdown,
  exportAsCsv,
  copyToClipboard,
  type DiscordExportMode,
} from "@/lib/stats/export";
import {
  generateDiscordBanner,
  type BannerData,
} from "@/app/components/stats/DiscordBanner";
import { DateRangeSelector } from "@/app/components/stats/DateRangeSelector";
import { StatsCards } from "@/app/components/stats/StatsCards";
import { HourlyChart } from "@/app/components/stats/HourlyChart";
import { VolumeChart } from "@/app/components/stats/VolumeChart";
import { HandlerLeaderboard } from "@/app/components/stats/HandlerLeaderboard";
import { TicketsTable } from "@/app/components/stats/TicketsTable";
import { DayOfWeekChart } from "@/app/components/stats/DayOfWeekChart";
import { TopUsersTable } from "@/app/components/stats/TopUsersTable";
import { HandlerHeatmap } from "@/app/components/stats/HandlerHeatmap";
import { AdvancedStatsGrid } from "@/app/components/stats/AdvancedStatsGrid";
import { ResponseDonut } from "@/app/components/stats/ResponseDonut";
import { ExportMenu } from "@/app/components/stats/ExportMenu";
import { HandlerDetailModal } from "@/app/components/stats/HandlerDetailModal";
import { QuickInsights } from "@/app/components/stats/QuickInsights";
import { HandlerStatsToggle } from "@/app/components/stats/HandlerStatsToggle";
import { RefreshCw, Upload, Filter, X } from "lucide-react";
import { saveAs } from "file-saver";
import Link from "next/link";

function qs(from: string, to: string, handler?: string | null) {
  let q = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  if (handler) q += `&handler=${encodeURIComponent(handler)}`;
  return q;
}

export default function DashboardPage() {
  const { from, to, groupBy, handlerFilter, showOnlySupport, setHandlerFilter, setShowOnlySupport } = useDashboardStore();

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [hourly, setHourly] = useState<HourlyBucket[]>([]);
  const [handlers, setHandlers] = useState<HandlerStat[]>([]);
  const [volume, setVolume] = useState<VolumeBucket[]>([]);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [weekday, setWeekday] = useState<DayOfWeekBucket[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [heatmap, setHeatmap] = useState<HandlerHourly[]>([]);

  const [advanced, setAdvanced] = useState<AdvancedStats | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);

  const PAGE_SIZE = 25;
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Fetch only the ticket list (for search / page changes)
  const fetchTickets = useCallback(async () => {
    const q = qs(from, to, handlerFilter);
    const s = search ? `&search=${encodeURIComponent(search)}` : "";
    try {
      const tk = await fetch(
        `/api/stats/tickets?${q}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${s}`
      ).then((r) => r.json());
      setTickets(tk.tickets);
      setTicketTotal(tk.total);
    } catch {
      // ignore
    }
  }, [from, to, page, search, handlerFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const q = qs(from, to, handlerFilter);
    const s = search ? `&search=${encodeURIComponent(search)}` : "";
    
    try {
      if (showOnlySupport) {
        // Use support-only API for all statistics
        const [supportStats, hdResponse, tk] = await Promise.all([
          fetch(`/api/stats/support?${q}&groupBy=${groupBy}`).then((r) => r.json()),
          fetch(`/api/stats/handlers-support?${qs(from, to)}`).then((r) => r.json()),
          fetch(
            `/api/stats/tickets?${q}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${s}`
          ).then((r) => r.json()),
        ]);
        
        // Handle different response formats
        const hd = hdResponse.handlers || hdResponse;
        
        setOverview(supportStats.overview);
        setHourly(supportStats.hourly);
        setHandlers(hd);
        setVolume(supportStats.volume);
        setTickets(tk.tickets);
        setTicketTotal(tk.total);
        setWeekday(supportStats.weekday);
        setTopUsers(supportStats.topUsers);
        setHeatmap(supportStats.heatmap);
        setAdvanced(supportStats.advanced);
      } else {
        // Use regular API for all statistics with supportOnly parameter
        const [ov, hr, hdResponse, vol, tk, wd, tu, hm, adv] =
          await Promise.all([
            fetch(`/api/stats/overview?${q}&supportOnly=${showOnlySupport}`).then((r) => r.json()),
            fetch(`/api/stats/hourly?${q}&supportOnly=${showOnlySupport}`).then((r) => r.json()),
            fetch(`/api/stats/handlers?${qs(from, to)}`).then((r) => r.json()),
            fetch(`/api/stats/volume?${q}&groupBy=${groupBy}`).then((r) =>
              r.json()
            ),
            fetch(
              `/api/stats/tickets?${q}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${s}`
            ).then((r) => r.json()),
            fetch(`/api/stats/weekday?${q}`).then((r) => r.json()),
            fetch(`/api/stats/users?${q}`).then((r) => r.json()),
            fetch(`/api/stats/heatmap?${q}&supportOnly=${showOnlySupport}`).then((r) => r.json()),
            fetch(`/api/stats/advanced?${q}`).then((r) => r.json()),
          ]);
        
        // Handle different response formats
        const hd = hdResponse.handlers || hdResponse;
        
        setOverview(ov);
        setHourly(hr);
        setHandlers(hd);
        setVolume(vol);
        setTickets(tk.tickets);
        setTicketTotal(tk.total);
        setWeekday(wd);
        setTopUsers(tu);
        setHeatmap(hm);
        setAdvanced(adv);
      }
    } catch {
      // silently fail — stats will show empty
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy, page, search, handlerFilter, showOnlySupport]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setPage(0);
  }, [from, to]);

  // Debounced search — only re-fetch tickets
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchTickets();
    }, 300);
  }

  const isEmpty = overview && overview.totalTickets === 0;

  // ─── Export handlers ─────────────────────────────────

  const bannerData = async (): Promise<BannerData> => {
    // Choose handlers endpoint based on toggle
    const handlersEndpoint = showOnlySupport ? '/api/stats/handlers-support' : '/api/stats/handlers';
    const handlersResponse = await fetch(`${handlersEndpoint}?${qs(from, to)}`).then((r) => r.json());
    
    // Handle different response formats
    const supportHandlers = handlersResponse.handlers || handlersResponse;
    
    return {
      from,
      to,
      overview,
      handlers: supportHandlers,
      hourly,
      advanced,
      weekday,
    };
  };

  // Memoize banner data function to prevent unnecessary re-renders
  const memoizedBannerData = useCallback(bannerData, [from, to, overview, hourly, advanced, weekday, showOnlySupport]);

  const discordData = () => ({
    from,
    to,
    overview,
    handlers,
    hourly,
    advanced,
    comparison: null,
    weekday,
    topUsers,
    keywords: [],
  });

  async function handleExportImage() {
    setExporting(true);
    try {
      await exportAsImage("dashboard-content", `soporte-${from}-${to}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportAsPdf("dashboard-content", `soporte-${from}-${to}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportDiscordBanner() {
    setExporting(true);
    try {
      const data = await memoizedBannerData();
      await generateDiscordBanner(data);
    } finally {
      setExporting(false);
    }
  }

  function handleExportDiscord(mode: DiscordExportMode) {
    const parts = exportAsDiscordMarkdown(discordData(), mode);
    const md = parts.join("\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    saveAs(blob, `soporte-${from}-${to}.md`);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const q = qs(from, to, handlerFilter);
      const res = await fetch(`/api/stats/tickets?${q}&limit=100000&offset=0`);
      const data = await res.json();
      exportAsCsv(data.tickets, `soporte-${from}-${to}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleCopyDiscord(mode: DiscordExportMode) {
    const parts = exportAsDiscordMarkdown(discordData(), mode);
    if (parts.length === 1) {
      await copyToClipboard(parts[0]);
    } else {
      // Copy each part separated by a visual delimiter so user can paste them as separate messages
      await copyToClipboard(parts.join("\n\n═══ SIGUIENTE MENSAJE ═══\n\n"));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Estadísticas del equipo de soporte
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            onExportImage={handleExportImage}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
            onExportDiscordBanner={handleExportDiscordBanner}
            onExportDiscord={handleExportDiscord}
            onCopyDiscord={handleCopyDiscord}
            exporting={exporting}
          />
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-text-secondary transition-all hover:bg-surface-hover hover:border-border/80 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <DateRangeSelector />
        <div className="h-5 w-px bg-border" />
        <HandlerStatsToggle 
          showOnlySupport={showOnlySupport} 
          onToggle={setShowOnlySupport} 
        />
        {handlers.length > 0 && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-text-secondary" />
              <select
                value={handlerFilter ?? ""}
                onChange={(e) => setHandlerFilter(e.target.value || null)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-amber/50 focus:outline-none"
              >
                <option value="">Todos los handlers</option>
                {handlers.map((h) => (
                  <option key={h.handler} value={h.handler}>
                    {h.handler}
                  </option>
                ))}
              </select>
              {handlerFilter && (
                <button
                  onClick={() => setHandlerFilter(null)}
                  className="flex items-center gap-1 rounded-lg bg-amber/15 px-2.5 py-1 text-xs font-medium text-amber hover:bg-amber/25 transition-colors"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && !overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="h-72 animate-pulse rounded-xl border border-border bg-surface" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-active">
            <Upload className="h-6 w-6 text-text-secondary/50" />
          </div>
          <p className="mt-4 text-sm font-medium text-text-secondary">
            No hay datos para este período
          </p>
          <p className="mt-1 text-xs text-text-secondary/70">
            Importa datos de soporte para ver las estadísticas
          </p>
          <Link
            href="/estadisticas/import"
            className="mt-5 rounded-xl bg-amber px-5 py-2.5 text-sm font-medium text-black hover:bg-amber/90 transition-colors"
          >
            Importar datos
          </Link>
        </div>
      )}

      {!isEmpty && overview && (
        <div id="dashboard-content" className="space-y-6">
          <StatsCards stats={overview} />

          <QuickInsights
            overview={overview}
            handlers={handlers}
            hourly={hourly}
            weekday={weekday}
            advanced={advanced}
            topUsers={topUsers}
          />

          <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_auto]">
            <ResponseDonut stats={overview} />
          </div>

          <AdvancedStatsGrid stats={advanced} />

          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <HourlyChart data={hourly} />
            <HandlerLeaderboard
              data={handlers}
              onHandlerClick={setSelectedHandler}
            />
          </div>

          <VolumeChart data={volume} />

          <HandlerHeatmap data={heatmap} />

          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <DayOfWeekChart data={weekday} />
            <TopUsersTable data={topUsers} />
          </div>

          <TicketsTable
            tickets={tickets}
            total={ticketTotal}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            search={search}
            onSearchChange={handleSearchChange}
          />
        </div>
      )}

      {selectedHandler && (
        <HandlerDetailModal
          handler={selectedHandler}
          from={from}
          to={to}
          onClose={() => setSelectedHandler(null)}
        />
      )}
    </div>
  );
}
