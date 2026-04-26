"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TicketCategory } from "@/lib/stats/types";
import { getIconComponent, AVAILABLE_ICONS, CATEGORY_COLORS } from "@/lib/stats/category-icons";
import {
  Tags, CheckCircle, AlertTriangle, Loader2, BarChart3,
  TrendingUp, RefreshCw, Settings, Download, Upload,
  Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronUp, Copy,
} from "lucide-react";

interface CategoryStats {
  categoryId: number;
  categoryName: string;
  ticketCount: number;
  percentage: number;
}

interface CategoryForm {
  id?: number;
  name: string;
  color: string;
  icon: string;
  description: string;
  keywords: string;
  weight: number;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: CategoryForm = {
  name: "",
  color: "#6b7280",
  icon: "fa-folder",
  description: "",
  keywords: "",
  weight: 3,
  isActive: true,
  sortOrder: 0,
};

export default function CategoryManager() {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categorizing, setCategorizing] = useState(false);
  const [categorizationProgress, setCategorizationProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [testRequest, setTestRequest] = useState("");
  const [testResult, setTestResult] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "test" | "batch" | "manage">("overview");
  const [permissions, setPermissions] = useState<any>(null);

  // CRUD state
  const [editingForm, setEditingForm] = useState<CategoryForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [keywordInput, setKeywordInput] = useState("");

  const clearMessages = useCallback(() => {
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  }, []);

  // Memoize category stats mapping for performance
  const categoryStatsMap = useMemo(() => {
    const map = new Map<number, CategoryStats>();
    categoryStats.forEach(stat => {
      map.set(stat.categoryId, stat);
    });
    return map;
  }, [categoryStats]);

  useEffect(() => {
    fetchCategories();
    fetchCategoryStats();
    // Fetch user permissions
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.permissions) setPermissions(data.permissions);
      })
      .catch(() => {});
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "n" && activeTab === "manage" && !editingForm) {
        e.preventDefault();
        startCreate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, editingForm]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ticket-categories?all=true");
      if (!res.ok) throw new Error("Failed to fetch categories");
      setCategories(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch("/api/ticket-categories/stats");
      if (!res.ok) throw new Error("Failed to fetch category stats");
      setCategoryStats(await res.json());
    } catch (err) {
      console.error("Failed to fetch category stats:", err);
    }
  };

  // ── CRUD operations ───────────────────────────────────

  const startCreate = () => {
    const maxSort = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    setEditingForm({ ...emptyForm, sortOrder: maxSort + 1 });
    setIsCreating(true);
    setKeywordInput("");
  };

  const startEdit = (cat: TicketCategory) => {
    setEditingForm({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      description: cat.description ?? "",
      keywords: cat.keywords ?? "",
      weight: cat.weight ?? 3,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    });
    setIsCreating(false);
    setKeywordInput("");
  };

  const cancelEdit = () => {
    setEditingForm(null);
    setIsCreating(false);
    setKeywordInput("");
  };

  const saveCategory = async () => {
    if (!editingForm) return;
    if (!editingForm.name.trim() || !editingForm.color || !editingForm.icon) {
      setError("Nombre, color e ícono son requeridos"); clearMessages();
      return;
    }
    setSaving(true);
    try {
      const method = isCreating ? "POST" : "PUT";
      const res = await fetch("/api/ticket-categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSuccess(isCreating ? "Categoría creada" : "Categoría actualizada");
      cancelEdit();
      await Promise.all([fetchCategories(), fetchCategoryStats()]);
      clearMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      clearMessages();
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ticket-categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      const data = await res.json();
      setSuccess(data.softDeleted ? "Categoría desactivada (tiene tickets asociados)" : "Categoría eliminada");
      cancelEdit();
      await Promise.all([fetchCategories(), fetchCategoryStats()]);
      clearMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
      clearMessages();
    } finally {
      setDeletingId(null);
    }
  };

  const duplicateCategory = async (cat: TicketCategory) => {
    const maxSort = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    const duplicated: CategoryForm = {
      name: `${cat.name} (copia)`,
      color: cat.color,
      icon: cat.icon,
      description: cat.description ?? "",
      keywords: cat.keywords ?? "",
      weight: cat.weight ?? 3,
      isActive: true,
      sortOrder: maxSort + 1,
    };
    
    setEditingForm(duplicated);
    setIsCreating(true);
    setKeywordInput("");
  };

  // ── Keyword helpers ───────────────────────────────────

  const currentKeywords = (editingForm?.keywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (!kw || !editingForm) return;
    if (currentKeywords.includes(kw)) { setKeywordInput(""); return; }
    setEditingForm({ ...editingForm, keywords: [...currentKeywords, kw].join(",") });
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      keywords: currentKeywords.filter((k) => k !== kw).join(","),
    });
  };

  // ── Other actions ─────────────────────────────────────

  const testCategorization = async () => {
    if (!testRequest.trim()) return;
    setTestResult(null);
    try {
      const res = await fetch(`/api/ai/categorize?request=${encodeURIComponent(testRequest)}`);
      if (!res.ok) throw new Error("Failed to categorize");
      const data = await res.json();
      setTestResult(data.categoryId);
    } catch (err) {
      console.error("Categorization failed:", err);
      setError("Error al probar categorización"); clearMessages();
    }
  };

  const categorizeAllTickets = async () => {
    setCategorizing(true);
    setError(null);
    setSuccess(null);
    setCategorizationProgress({ current: 0, total: 0, percentage: 0 });
    try {
      const ticketsRes = await fetch("/api/stats/tickets?limit=5000");
      if (!ticketsRes.ok) throw new Error("Failed to fetch tickets");
      const ticketsData = await ticketsRes.json();

      const uncategorized = ticketsData.tickets
        .filter((t: { category_id?: number | null }) => !t.category_id)
        .map((t: { id: number; request: string }) => ({ id: t.id, request: t.request }));

      if (uncategorized.length === 0) {
        setSuccess("No hay tickets sin categoría"); clearMessages();
        return;
      }

      setCategorizationProgress({ current: 0, total: uncategorized.length, percentage: 0 });

      const catRes = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickets: uncategorized }),
      });
      if (!catRes.ok) throw new Error("Failed to categorize tickets");
      const catData = await catRes.json();

      const updateRes = await fetch("/api/tickets/update-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: catData.results }),
      });
      if (!updateRes.ok) throw new Error("Failed to update categories");

      setCategorizationProgress({ current: uncategorized.length, total: uncategorized.length, percentage: 100 });
      setSuccess(`${catData.results.length} tickets categorizados correctamente`);
      fetchCategoryStats();
      clearMessages();
    } catch {
      setError("Error al categorizar tickets"); clearMessages();
    } finally {
      setCategorizing(false);
      setTimeout(() => setCategorizationProgress({ current: 0, total: 0, percentage: 0 }), 5000);
    }
  };

  const exportCategories = async () => {
    try {
      const res = await fetch("/api/ticket-categories/export");
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-categories-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError("Error al exportar"); clearMessages();
    }
  };

  const importCategories = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/ticket-categories/import", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to import");
      setSuccess("Categorías importadas correctamente");
      fetchCategories(); fetchCategoryStats(); clearMessages();
    } catch {
      setError("Error al importar"); clearMessages();
    }
    event.target.value = "";
  };

  // ── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando categorías...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading announcement for screen readers */}
      {loading && (
        <div aria-live="polite" className="sr-only">
          Cargando categorías...
        </div>
      )}
      
      {/* Header */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-amber" />
            <h2 className="font-semibold">Categorización de tickets</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { fetchCategories(); fetchCategoryStats(); }} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors" aria-label="Actualizar categorías">
              <RefreshCw className="h-3 w-3" aria-hidden="true" /> Actualizar
            </button>
            {permissions?.can_manage_categories && (
              <button onClick={exportCategories} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors" aria-label="Exportar categorías">
                <Download className="h-3 w-3" aria-hidden="true" /> Exportar
              </button>
            )}
            {permissions?.can_manage_categories && (
              <label className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors">
                <Upload className="h-3 w-3" /> Importar
                <input type="file" accept=".json" onChange={importCategories} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-border" role="tablist" aria-label="Categorización tabs">
          {([
            { key: "overview" as const, label: "Estadísticas", Icon: BarChart3 },
            ...(permissions?.can_manage_categories ? [{ key: "manage" as const, label: "Gestionar", Icon: Settings }] : []),
            { key: "test" as const, label: "Probar", Icon: TrendingUp },
            { key: "batch" as const, label: "Procesar lote", Icon: Tags },
          ]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab(key);
                }
              }}
              aria-selected={activeTab === key}
              role="tab"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-amber text-amber"
                  : "border-transparent text-text-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green/30 bg-green/5 px-3 py-2 text-sm text-green">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* ── Overview Tab ─────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="font-semibold mb-4">Distribución por Categoría</h3>
            {categoryStats.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin datos de estadísticas</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((stat) => {
                  const cat = categories.find((c) => c.id === stat.categoryId);
                  const IconComp = getIconComponent(cat?.icon || "fa-folder");
                  return (
                    <div key={stat.categoryId} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="flex items-center gap-3">
                        <IconComp className="h-5 w-5" />
                        <div>
                          <div className="font-medium text-sm" style={{ color: cat?.color }}>{stat.categoryName}</div>
                          <div className="text-xs text-text-secondary">{stat.ticketCount} tickets</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(stat.percentage ?? 0, 100)}%`, backgroundColor: cat?.color }} />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right" style={{ color: cat?.color }}>{stat.percentage ?? 0}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Categories Grid */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="font-semibold mb-4">Todas las Categorías ({categories.filter((c) => c.isActive).length} activas)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.filter((c) => c.isActive).map((cat) => {
                const IconComp = getIconComponent(cat.icon);
                return (
                  <div key={cat.id} className="flex items-center gap-2 p-3 rounded-lg border bg-background/50 hover:border-border transition-colors" style={{ borderColor: cat.color + "40" }}>
                    <IconComp className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: cat.color }}>{cat.name}</div>
                      {cat.description && <div className="text-xs text-text-secondary truncate">{cat.description}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Manage Tab ───────────────────────────────── */}
      {activeTab === "manage" && (
        <div className="space-y-4">
          {/* Create button */}
          {!editingForm && (
            <button onClick={startCreate} className="flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-black hover:bg-amber/90 transition-colors" aria-label="Crear nueva categoría" title="Crear nueva categoría (Ctrl+N)">
              <Plus className="h-4 w-4" aria-hidden="true" /> Nueva Categoría
            </button>
          )}

          {/* Edit / Create Form */}
          {editingForm && (
            <div className="rounded-lg border border-amber/30 bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{isCreating ? "Nueva Categoría" : "Editar Categoría"}</h3>
                <button onClick={cancelEdit} className="rounded p-1 hover:bg-surface-hover"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
                  <input
                    value={editingForm.name}
                    onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none"
                    placeholder="Nombre de la categoría"
                    aria-label="Nombre de la categoría"
                    aria-required="true"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Descripción</label>
                  <input
                    value={editingForm.description}
                    onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none"
                    placeholder="Descripción breve"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditingForm({ ...editingForm, color: c })}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${editingForm.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={editingForm.color}
                      onChange={(e) => setEditingForm({ ...editingForm, color: e.target.value })}
                      className="h-7 w-7 rounded-full cursor-pointer border border-border"
                    />
                  </div>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Ícono</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_ICONS.slice(0, 14).map(({ value, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setEditingForm({ ...editingForm, icon: value })}
                        className={`p-1.5 rounded-md border transition-colors ${editingForm.icon === value ? "border-amber bg-amber/10" : "border-border/50 hover:border-border"}`}
                        title={value}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Peso (prioridad de coincidencia): {editingForm.weight}</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={editingForm.weight}
                    onChange={(e) => setEditingForm({ ...editingForm, weight: Number(e.target.value) })}
                    className="w-full accent-amber"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>Bajo</span><span>Alto</span>
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Orden</label>
                  <input
                    type="number"
                    min="0"
                    value={editingForm.sortOrder}
                    onChange={(e) => setEditingForm({ ...editingForm, sortOrder: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Palabras clave ({currentKeywords.length})
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-amber focus:outline-none"
                    placeholder="Agregar palabra clave y presionar Enter"
                  />
                  <button onClick={addKeyword} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-hover">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                  {currentKeywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 rounded-full bg-amber/10 text-amber px-2.5 py-0.5 text-xs font-medium">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red ml-0.5"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  {currentKeywords.length === 0 && (
                    <span className="text-xs text-text-secondary italic">Sin palabras clave — la categoría no participará en la auto-categorización</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <button onClick={saveCategory} disabled={saving} className="flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-black hover:bg-amber/90 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreating ? "Crear" : "Guardar"}
                </button>
                <button onClick={cancelEdit} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="rounded-lg border border-border bg-surface divide-y divide-border">
            {categories.length === 0 ? (
              <div className="p-5 text-center text-sm text-text-secondary">No hay categorías</div>
            ) : (
              categories.map((cat) => {
                const IconComp = getIconComponent(cat.icon);
                const isExpanded = expandedId === cat.id;
                const kws = (cat.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean);
                const stat = categoryStats.find((s) => s.categoryId === cat.id);

                return (
                  <div key={cat.id} className={`${!cat.isActive ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <IconComp className="h-5 w-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" style={{ color: cat.color }}>{cat.name}</span>
                          {!cat.isActive && <span className="rounded bg-red/10 text-red text-[10px] px-1.5 py-0.5">Inactiva</span>}
                        </div>
                        {cat.description && <div className="text-xs text-text-secondary truncate">{cat.description}</div>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        {stat && <span>{stat.ticketCount} tickets</span>}
                        <span className="text-[10px]">Peso: {cat.weight}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(cat)} className="rounded p-1.5 hover:bg-surface-hover transition-colors" title="Editar">
                          <Pencil className="h-3.5 w-3.5 text-text-secondary" />
                        </button>
                        <button onClick={() => duplicateCategory(cat)} className="rounded p-1.5 hover:bg-surface-hover transition-colors" title="Duplicar">
                          <Copy className="h-3.5 w-3.5 text-text-secondary" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          disabled={deletingId === cat.id}
                          className="rounded p-1.5 hover:bg-red/10 transition-colors"
                          title="Eliminar"
                        >
                          {deletingId === cat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-text-secondary hover:text-red" />}
                        </button>
                        <button onClick={() => setExpandedId(isExpanded ? null : cat.id)} className="rounded p-1.5 hover:bg-surface-hover transition-colors">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {kws.length > 0 ? kws.map((kw) => (
                            <span key={kw} className="rounded-full bg-amber/10 text-amber px-2 py-0.5 text-[11px]">{kw}</span>
                          )) : (
                            <span className="text-xs text-text-secondary italic">Sin palabras clave</span>
                          )}
                        </div>
                        <div className="flex gap-4 text-[11px] text-text-secondary">
                          <span>Orden: {cat.sortOrder}</span>
                          <span>Peso: {cat.weight}</span>
                          <span>Ícono: {cat.icon}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Test Tab ─────────────────────────────────── */}
      {activeTab === "test" && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="font-semibold mb-4">Probar Categorización</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={testRequest}
                onChange={(e) => setTestRequest(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") testCategorization(); }}
                placeholder="Ingresa una solicitud de ticket para probar..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber focus:outline-none"
              />
              <button onClick={testCategorization} className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-black hover:bg-amber/90 transition-colors">
                Probar
              </button>
            </div>
            {testResult && (() => {
              const cat = categories.find((c) => c.id === testResult);
              const IconComp = cat ? getIconComponent(cat.icon) : null;
              return (
                <div className="flex items-center gap-3 rounded-lg border border-green/30 bg-green/5 px-4 py-3">
                  {IconComp && <IconComp className="h-5 w-5" />}
                  <div>
                    <span className="text-sm font-medium" style={{ color: cat?.color }}>
                      {cat?.name ?? "Desconocida"}
                    </span>
                    <p className="text-xs text-text-secondary">{cat?.description}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Batch Tab ────────────────────────────────── */}
      {activeTab === "batch" && (
        <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
          <h3 className="font-semibold">Procesamiento por Lote</h3>

          {(categorizing || categorizationProgress.total > 0) && (
            <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progreso de Categorización</span>
                <span className="text-sm text-text-secondary">
                  {categorizationProgress.current} / {categorizationProgress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300 bg-amber" style={{ width: `${categorizationProgress.percentage}%` }} />
              </div>
              <div className="text-center text-lg font-semibold text-amber">
                {categorizationProgress.percentage.toFixed(1)}%
              </div>
              {categorizing && (
                <div className="text-center text-sm text-text-secondary">
                  <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> Procesando tickets...
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={categorizeAllTickets}
              disabled={categorizing}
              className="flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-black hover:bg-amber/90 disabled:opacity-50 transition-colors"
            >
              {categorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {categorizing ? "Procesando..." : "Categorizar Tickets sin Categoría"}
            </button>
            <p className="text-sm text-text-secondary">
              El sistema analizará todos los tickets sin categoría y los clasificará automáticamente usando las palabras clave definidas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
