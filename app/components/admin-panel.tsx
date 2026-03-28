"use client";

import { useMemo, useState } from "react";
import { Search, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type SanctionItem = {
  id: string;
  fecha: string;
  supportName: string;
  supportDiscordId: string;
  adminName: string;
  requestedSanction: string;
  appliedSanction: string;
  accumulationNote: string | null;
  createdAt: Date;
};

type AdminPanelProps = {
  sanctions: SanctionItem[];
};

function asDate(value: Date) {
  return new Date(value).toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function deleteSanction(id: string) {
  const response = await fetch("/api/discord/sanctions", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    throw new Error("Error al eliminar la sanción");
  }

  return response.json();
}

function getUpdatedSanction(baseSanction: SanctionItem, formData: FormData) {
  return {
    id: baseSanction.id,
    supportName: (formData.get("supportName") as string) || baseSanction.supportName,
    supportDiscordId: (formData.get("supportDiscordId") as string) || baseSanction.supportDiscordId,
    adminName: (formData.get("adminName") as string) || baseSanction.adminName,
    requestedSanction: (formData.get("requestedSanction") as string) || baseSanction.requestedSanction,
    appliedSanction: (formData.get("appliedSanction") as string) || baseSanction.appliedSanction,
    accumulationNote: (formData.get("accumulationNote") as string) || baseSanction.accumulationNote || null,
    fecha: (formData.get("fecha") as string) || baseSanction.fecha,
  };
}

export function AdminPanel({ sanctions }: AdminPanelProps) {
  const [query, setQuery] = useState("");
  const [sanctionFilter, setSanctionFilter] = useState("all");
  const [expansions, setExpansions] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SanctionItem> | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  const sanctionKinds = useMemo(() => {
    return Array.from(new Set(sanctions.map((item) => item.appliedSanction))).sort();
  }, [sanctions]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sanctions.filter((item) => {
      const matchesQuery =
        item.supportName.toLowerCase().includes(normalizedQuery) ||
        item.supportDiscordId.toLowerCase().includes(normalizedQuery) ||
        item.adminName.toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        sanctionFilter === "all" || item.appliedSanction === sanctionFilter;

      return matchesQuery && matchesFilter;
    });
  }, [query, sanctionFilter, sanctions]);

  const toggleExpanded = (id: string) => {
    setExpansions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteClick = (id: string) => {
    setIsDeletingId(id);
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await deleteSanction(id);
      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error deleting sanction:", error);
      alert("Error al eliminar la sanción");
      setIsDeletingId(null);
    }
  };

  const handleEditClick = (sanction: SanctionItem) => {
    setEditingId(sanction.id);
    setEditData({ ...sanction });
  };

  const handleEditChange = (field: string, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async (sanction: SanctionItem) => {
    if (!editData) return;

    setIsUpdatingId(sanction.id);
    try {
      const response = await fetch("/api/discord/sanctions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sanction.id,
          ...editData,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar la sanción");
      }

      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error updating sanction:", error);
      alert("Error al actualizar la sanción");
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  return (
    <UICard className="space-y-6">
      {/* Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-grey)]" />
          <input
            type="text"
            placeholder="Buscar por nombre, Discord ID o admin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-[var(--color-neutral-white)] outline-none placeholder:text-[var(--color-neutral-grey)] focus:border-[#ffac00]/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSanctionFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              sanctionFilter === "all"
                ? "bg-[#ffac00]/30 text-[#ffac00]"
                : "bg-white/5 text-[var(--color-neutral-grey)] hover:bg-white/10"
            }`}
          >
            Todas ({sanctions.length})
          </button>
          {sanctionKinds.map((kind) => {
            const count = sanctions.filter((s) => s.appliedSanction === kind).length;
            return (
              <button
                key={kind}
                onClick={() => setSanctionFilter(kind)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  sanctionFilter === kind
                    ? "bg-[#ffac00]/30 text-[#ffac00]"
                    : "bg-white/5 text-[var(--color-neutral-grey)] hover:bg-white/10"
                }`}
              >
                {kind} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Sanctions List */}
      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-[var(--color-neutral-grey)]">
              No se encontraron sanciones que coincidan con tu búsqueda.
            </p>
          </div>
        ) : (
          filtered.map((sanction) => {
            const isEditing = editingId === sanction.id;
            const isDeleting = isDeletingId === sanction.id;
            const isExpanded = expansions[sanction.id];

            return (
              <div
                key={sanction.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/[0.07]"
              >
                {/* Header - Title Row */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleExpanded(sanction.id)}
                    className="flex flex-1 items-center gap-3 text-left hover:opacity-80"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-[var(--color-neutral-grey)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--color-neutral-grey)]" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-[var(--color-neutral-white)]">
                        {sanction.supportName}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-grey)]">
                        {sanction.appliedSanction} • {asDate(sanction.createdAt)}
                      </p>
                    </div>
                  </button>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!isEditing && !isDeleting && (
                      <>
                        <button
                          onClick={() => handleEditClick(sanction)}
                          className="rounded-lg bg-blue-500/20 p-2 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="Editar sanción"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(sanction.id)}
                          className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30 transition-colors"
                          title="Eliminar sanción"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete Confirmation */}
                {isDeleting && (
                  <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm text-red-300 mb-3">
                      ¿Estás seguro de que deseas eliminar esta sanción? Esta acción es irreversible.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmDelete(sanction.id)}
                        className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setIsDeletingId(null)}
                        className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                {isEditing && editData && (
                  <div className="mt-4 space-y-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-neutral-grey)] mb-1">
                          Nombre
                        </label>
                        <input
                          type="text"
                          value={editData.supportName || ""}
                          onChange={(e) => handleEditChange("supportName", e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-neutral-grey)] mb-1">
                          Discord ID
                        </label>
                        <input
                          type="text"
                          value={editData.supportDiscordId || ""}
                          onChange={(e) => handleEditChange("supportDiscordId", e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-neutral-grey)] mb-1">
                          Admin
                        </label>
                        <input
                          type="text"
                          value={editData.adminName || ""}
                          onChange={(e) => handleEditChange("adminName", e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-neutral-grey)] mb-1">
                          Sanción Solicitada
                        </label>
                        <input
                          type="text"
                          value={editData.requestedSanction || ""}
                          onChange={(e) => handleEditChange("requestedSanction", e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-neutral-grey)] mb-1">
                          Sanción Aplicada
                        </label>
                        <input
                          type="text"
                          value={editData.appliedSanction || ""}
                          onChange={(e) => handleEditChange("appliedSanction", e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-neutral-grey)] mb-1">
                          Fecha
                        </label>
                        <input
                          type="text"
                          value={editData.fecha || ""}
                          onChange={(e) => handleEditChange("fecha", e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-blue-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-neutral-grey)] mb-1">
                        Nota de Acumulación
                      </label>
                      <textarea
                        value={editData.accumulationNote || ""}
                        onChange={(e) => handleEditChange("accumulationNote", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none focus:border-blue-500/50"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(sanction)}
                        disabled={isUpdatingId === sanction.id}
                        className="flex-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                      >
                        {isUpdatingId === sanction.id ? "Guardando..." : "Guardar Cambios"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isUpdatingId === sanction.id}
                        className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Details */}
                {isExpanded && !isEditing && !isDeleting && (
                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-neutral-grey)]">Discord ID:</span>
                      <span className="font-mono text-[var(--color-neutral-white)]">
                        {sanction.supportDiscordId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-neutral-grey)]">Admin:</span>
                      <span className="text-[var(--color-neutral-white)]">{sanction.adminName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-neutral-grey)]">Fecha de Sanción:</span>
                      <span className="text-[var(--color-neutral-white)]">{sanction.fecha}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-neutral-grey)]">Sanción Solicitada:</span>
                      <span className="text-[var(--color-neutral-white)]">
                        {sanction.requestedSanction}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-neutral-grey)]">Sanción Aplicada:</span>
                      <span className="text-[var(--color-accent-green)]">{sanction.appliedSanction}</span>
                    </div>
                    {sanction.accumulationNote && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3 mt-2">
                        <p className="text-xs text-[var(--color-neutral-grey)] mb-1">Nota de Acumulación:</p>
                        <p className="text-sm text-[var(--color-neutral-white)]">{sanction.accumulationNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-[var(--color-neutral-grey)]">
            Mostrando {filtered.length} de {sanctions.length} sanciones
          </p>
        </div>
      )}
    </UICard>
  );
}
