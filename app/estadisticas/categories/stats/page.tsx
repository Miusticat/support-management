"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { TicketCategory } from "@/lib/stats/types";
import { getIconComponent } from "@/lib/stats/category-icons";
import {
  generateDiscordBanner,
  type CategoryBannerData,
} from "@/app/components/stats/CategoryDiscordBanner";
import { RefreshCw, Download, Filter, X, BarChart3, TrendingUp, Users, AlertCircle, Tags, ChevronDown, Check, Shield, Trophy, Clock, FileText, Activity, Target, Zap, Star, Calendar } from "lucide-react";
import {
  Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid,
  AreaChart, Area, BarChart, Bar, PieChart,
} from "recharts";

interface CategoryStat {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalTickets: number;
  respondedTickets: number;
  unrespondedTickets: number;
  responseRate: number;
  topHandlers: Array<{
    handler: string;
    ticketCount: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    count: number;
  }>;
}

interface FilterOptions {
  dateFrom: string;
  dateTo: string;
  supportOnly: boolean;
  categoryIds: number[];
}

// ─── Category Multi-Select Dropdown ─────────────────────
function CategoryMultiSelect({
  categories,
  selected,
  onChange,
}: {
  categories: TicketCategory[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const label =
    selected.length === 0
      ? "Todas las categorías"
      : selected.length === 1
        ? categories.find((c) => c.id === selected[0])?.name ?? "1 seleccionada"
        : `${selected.length} seleccionadas`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none"
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown className={`ml-1 h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-xl">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover"
            >
              <X className="h-3 w-3" /> Limpiar selección
            </button>
          )}
          {categories.map((c) => {
            const checked = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked ? "border-amber bg-amber" : "border-border bg-background"
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color ?? "#6b7280" }} />
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CategoriesStatsPage() {
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
    supportOnly: false,
    categoryIds: [],
  });

  useEffect(() => {
    fetch("/api/ticket-categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => {});
    
    // Fetch user permissions
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.permissions) setPermissions(data.permissions);
      })
      .catch(() => {});
  }, []);

  const fetchStats = useCallback(async () => {
    // Don't fetch if dates are empty/invalid
    if (!filters.dateFrom || !filters.dateTo) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: filters.dateFrom,
        to: filters.dateTo,
        supportOnly: filters.supportOnly.toString(),
      });
      if (filters.categoryIds.length > 0) {
        params.append("categories", filters.categoryIds.join(","));
      }
      const res = await fetch(`/api/ticket-categories/stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        // API now returns { categories, uncategorizedCount }
        if (data.categories) {
          setStats(data.categories);
          setUncategorizedCount(data.uncategorizedCount ?? 0);
        } else if (Array.isArray(data)) {
          setStats(data);
          setUncategorizedCount(0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFilterChange = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const exportStats = () => {
    const BOM = "\uFEFF";
    const header = [
      "Categoría",
      "Total tickets",
      "Respondidos",
      "Sin responder",
      "Tasa de respuesta (%)",
      "Top Handler 1",
      "Top Handler 1 Tickets",
      "Top Handler 2",
      "Top Handler 2 Tickets",
      "Top Handler 3",
      "Top Handler 3 Tickets",
      "Promedio diario",
    ];
    const rows = stats.map((s) => {
      const h = s.topHandlers ?? [];
      const days = s.dailyTrend?.length || 1;
      const avg = (s.totalTickets / days).toFixed(1);
      return [
        `"${s.categoryName}"`,
        s.totalTickets,
        s.respondedTickets,
        s.unrespondedTickets,
        s.responseRate,
        h[0]?.handler ?? "",
        h[0]?.ticketCount ?? "",
        h[1]?.handler ?? "",
        h[1]?.ticketCount ?? "",
        h[2]?.handler ?? "",
        h[2]?.ticketCount ?? "",
        avg,
      ];
    });
    // Summary row
    rows.push([]);
    rows.push(["TOTAL", totalTickets, totalResponded, totalTickets - totalResponded, overallResponseRate, "", "", "", "", "", "", ""]);
    if (uncategorizedCount > 0) {
      rows.push(["Sin categorizar", uncategorizedCount, "", "", "", "", "", "", "", "", "", ""]);
    }
    rows.push([]);
    rows.push([`Periodo: ${filters.dateFrom} a ${filters.dateTo}`]);
    if (filters.supportOnly) rows.push(["Filtro: Solo Support's"]);

    const csvContent = BOM + [header, ...rows].map((row) => (row as any[]).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `categories-stats-${filters.dateFrom}-to-${filters.dateTo}${filters.supportOnly ? "-support" : ""}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const buildBannerData = useCallback((): CategoryBannerData => ({
    from: filters.dateFrom,
    to: filters.dateTo,
    categories: stats,
    uncategorizedCount,
    supportOnly: filters.supportOnly,
  }), [filters.dateFrom, filters.dateTo, filters.supportOnly, stats, uncategorizedCount]);

  async function handleExportDiscordBanner() {
    setExporting(true);
    try {
      await generateDiscordBanner(buildBannerData());
    } finally {
      setExporting(false);
    }
  }

  const totalTickets = stats.reduce((sum, s) => sum + s.totalTickets, 0);
  const totalResponded = stats.reduce((sum, s) => sum + s.respondedTickets, 0);
  const overallResponseRate = totalTickets > 0 ? ((totalResponded / totalTickets) * 100).toFixed(1) : "0";

  // Global top handlers (aggregated across all categories)
  const globalHandlerMap = new Map<string, number>();
  stats.forEach((s) => {
    (s.topHandlers ?? []).forEach((h) => {
      globalHandlerMap.set(h.handler, (globalHandlerMap.get(h.handler) || 0) + h.ticketCount);
    });
  });
  const globalTopHandlers = [...globalHandlerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Aggregate daily trend (sum all categories per day)
  const dailyMap = new Map<string, number>();
  stats.forEach((s) => {
    (s.dailyTrend ?? []).forEach((d) => {
      dailyMap.set(d.date, (dailyMap.get(d.date) || 0) + d.count);
    });
  });
  const aggregateTrend = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date: date.slice(5), count }));
  const dailyAvg = aggregateTrend.length > 0
    ? (aggregateTrend.reduce((s, d) => s + d.count, 0) / aggregateTrend.length).toFixed(1)
    : "0";

  // Chart data
  const pieData = stats.filter((s) => s.totalTickets > 0).map((s) => ({
    name: s.categoryName,
    value: s.totalTickets,
    color: s.categoryColor || "#6b7280",
  }));

  const barData = stats.map((s) => ({
    name: s.categoryName,
    responded: s.respondedTickets,
    unresponded: s.unrespondedTickets,
    color: s.categoryColor,
    icon: s.categoryIcon,
  }));

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-amber" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas de categorías</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Análisis detallado del rendimiento por categoría
            {filters.supportOnly && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber">
                <Shield className="h-3 w-3" /> Solo Support&apos;s
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 bg-amber text-black rounded-lg hover:bg-amber/90 text-sm font-medium transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
          <button onClick={exportStats} disabled={!permissions?.can_export} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={!permissions?.can_export ? "No tienes permisos para exportar" : undefined}>
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={handleExportDiscordBanner} disabled={exporting || !permissions?.can_export} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={!permissions?.can_export ? "No tienes permisos para exportar" : undefined}>
            <Download className="h-4 w-4" /> {exporting ? "Exportando..." : "Discord Banner"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-amber" />
          <h2 className="font-semibold text-sm">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Desde</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange("dateFrom", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Hasta</label>
            <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange("dateTo", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Vista</label>
            <select value={filters.supportOnly.toString()} onChange={(e) => handleFilterChange("supportOnly", e.target.value === "true")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none">
              <option value="false">Todos los tickets</option>
              <option value="true">Solo Support&apos;s</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Categorías</label>
            <CategoryMultiSelect
              categories={categories}
              selected={filters.categoryIds}
              onChange={(ids) => handleFilterChange("categoryIds", ids)}
            />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Tickets" value={(totalTickets + uncategorizedCount).toLocaleString()} icon={<FileText className="h-5 w-5 text-amber" />} />
        <StatCard label="Atendidos" value={totalResponded.toLocaleString()} sub={`${(totalTickets - totalResponded).toLocaleString()} pendientes`} icon={<Check className="h-5 w-5 text-green" />} accent="text-green" />
        <StatCard label="Tasa respuesta" value={`${overallResponseRate}%`} icon={<Target className="h-5 w-5 text-amber" />} accent={Number(overallResponseRate) >= 80 ? "text-green" : Number(overallResponseRate) >= 50 ? "text-amber" : "text-red"} />
        <StatCard label="Promedio/día" value={dailyAvg} sub={`${aggregateTrend.length} días`} icon={<Activity className="h-5 w-5 text-foreground" />} />
        <StatCard label="Categorías" value={String(stats.filter((s) => s.totalTickets > 0).length)} sub={`de ${stats.length}`} icon={<Zap className="h-5 w-5 text-foreground" />} />
        <StatCard label="Sin categoría" value={uncategorizedCount.toLocaleString()} icon={<AlertCircle className="h-5 w-5 text-red" />} accent={uncategorizedCount > 0 ? "text-red" : "text-text-secondary"} />
      </div>

      {/* Charts Row */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-amber" />
              <h3 className="font-semibold text-sm">Distribución por categoría</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} strokeWidth={0}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-text-secondary">{entry.name}</span>
                  <span className="font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart — Responded vs Unresponded */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-amber" />
              <h3 className="font-semibold text-sm">Respondidos vs Sin responder</h3>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 80, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis 
                  dataKey="icon" 
                  stroke="var(--color-text-secondary)"
                  interval={0}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const IconComponent = getIconComponent(payload.value);
                    const color = barData[payload.index]?.color || "#6b7280";
                    const yPos = typeof y === 'number' ? y + 20 : 0;
                    return (
                      <g transform={`translate(${x}, ${yPos})`}>
                        <foreignObject width="40" height="40" x="-20" y="-20">
                          <div className="flex items-center justify-center w-full h-full" style={{ color }}>
                            <IconComponent className="h-7 w-7" />
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
                <Tooltip 
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(value) => {
                    const item = barData.find(d => d.icon === value);
                    return item?.name || value;
                  }}
                />
                <Bar dataKey="responded" stackId="a" fill="#10b981" />
                <Bar dataKey="unresponded" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Aggregate Trend + Global Top Handlers */}
      {(aggregateTrend.length > 1 || globalTopHandlers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aggregate Daily Trend */}
          {aggregateTrend.length > 1 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber" />
                  <h3 className="font-semibold text-sm">Tendencia diaria global</h3>
                </div>
                <span className="text-xs text-text-secondary">Promedio: {dailyAvg}/día</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={aggregateTrend} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" />
                  <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="var(--color-amber)" fill="var(--color-amber)" fillOpacity={0.1} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Global Top Handlers */}
          {globalTopHandlers.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-amber" />
                <h3 className="font-semibold text-sm">
                  {filters.supportOnly ? "Top Support's global" : "Top Handlers global"}
                </h3>
              </div>
              <div className="space-y-2">
                {globalTopHandlers.map(([handler, count], i) => {
                  const maxCount = globalTopHandlers[0][1];
                  const pct = totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(1) : "0";
                  return (
                    <div key={handler} className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
                      <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber/60" : "text-text-secondary"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm truncate ${i < 3 ? "font-semibold" : ""}`}>{handler}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className="text-xs font-medium">{count}</span>
                            <span className="text-[10px] text-text-secondary">{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-background overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: i < 3 ? "var(--color-amber)" : "var(--color-text-secondary)" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.map((stat) => {
          const IconComponent = getIconComponent(stat.categoryIcon ?? "fa-folder");
          const trendData = stat.dailyTrend.length > 1 ? stat.dailyTrend : [];

          return (
            <div key={stat.categoryId} className="rounded-xl border border-border bg-surface p-5">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: (stat.categoryColor ?? "#6b7280") + "15" }}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: stat.categoryColor ?? "#6b7280" }}>
                      {stat.categoryName}
                    </h3>
                    <p className="text-xs text-text-secondary">{stat.totalTickets} tickets</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold" style={{ color: stat.responseRate >= 80 ? "var(--color-green)" : stat.responseRate >= 50 ? "var(--color-amber)" : "var(--color-red)" }}>{stat.responseRate}%</p>
                  <p className="text-[10px] text-text-secondary">{filters.supportOnly ? "cobertura support" : "tasa respuesta"}</p>
                </div>
              </div>
              {/* Response rate bar */}
              <div className="w-full h-1.5 rounded-full bg-background overflow-hidden mb-4">
                <div className="h-full rounded-full transition-all" style={{ width: `${stat.responseRate}%`, backgroundColor: stat.responseRate >= 80 ? "var(--color-green)" : stat.responseRate >= 50 ? "var(--color-amber)" : "var(--color-red)" }} />
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2.5 rounded-lg bg-background/50">
                  <p className="text-base font-semibold">{stat.totalTickets}</p>
                  <p className="text-[10px] text-text-secondary">Total</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-background/50">
                  <p className="text-base font-semibold text-green">{stat.respondedTickets}</p>
                  <p className="text-[10px] text-text-secondary">Respondidos</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-background/50">
                  <p className="text-base font-semibold text-red">{stat.unrespondedTickets}</p>
                  <p className="text-[10px] text-text-secondary">Sin responder</p>
                </div>
              </div>

              {/* Trend Sparkline */}
              {trendData.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-text-secondary mb-2">Tendencia diaria</h4>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={trendData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                      <Area type="monotone" dataKey="count" stroke={stat.categoryColor || "#6b7280"} fill={(stat.categoryColor || "#6b7280") + "20"} strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Handlers */}
              {stat.topHandlers.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-secondary mb-2">Top Handlers</h4>
                  <div className="space-y-1.5">
                    {stat.topHandlers.slice(0, 5).map((handler, i) => (
                      <div key={handler.handler} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold w-4 text-center ${i === 0 ? "text-amber" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber/60" : "text-text-secondary"}`}>{i + 1}</span>
                          <span className="text-xs">{handler.handler}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{handler.ticketCount}</span>
                          <div className="w-12 h-1.5 rounded-full bg-background overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${handler.percentage}%`, backgroundColor: stat.categoryColor || "#6b7280" }} />
                          </div>
                          <span className="text-[10px] text-text-secondary w-8 text-right">{handler.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {stats.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16">
          <BarChart3 className="h-10 w-10 text-text-secondary/30 mb-3" />
          <p className="text-sm text-text-secondary">No hay datos para los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent, sub }: { label: string; value: string; icon: React.ReactNode; accent?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col items-center justify-center">
      {icon}
      <p className={`text-lg font-bold mt-2 ${accent ?? "text-foreground"}`}>{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
      {sub && <p className="text-[10px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}