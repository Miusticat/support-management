"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type PolicyInfraction = {
  id: string;
  fault: string;
  sanction: string;
  tags: string[];
  sortOrder: number;
};

type PolicyCategory = {
  id: string;
  name: string;
  sortOrder: number;
  infractions: PolicyInfraction[];
};

type ApiResponse = {
  categories?: PolicyCategory[];
  error?: string;
};

const sanctionsCatalog = [
  "Advertencia",
  "Warn Intermedio",
  "Warn Grave",
  "Suspension",
  "Remocion",
  "Warn Grave + Suspension",
  "Escalamiento de sancion",
  "Evaluacion del puesto",
];

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function SanctionPolicyManagementPanel() {
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [newFaultByCategory, setNewFaultByCategory] = useState<Record<string, string>>({});
  const [newSanctionByCategory, setNewSanctionByCategory] = useState<Record<string, string>>({});
  const [newTagsByCategory, setNewTagsByCategory] = useState<Record<string, string>>({});

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [editingInfractionId, setEditingInfractionId] = useState<string | null>(null);
  const [editingFault, setEditingFault] = useState("");
  const [editingSanction, setEditingSanction] = useState("");
  const [editingTags, setEditingTags] = useState("");

  const totalInfractions = useMemo(
    () => categories.reduce((sum, category) => sum + category.infractions.length, 0),
    [categories]
  );

  async function loadPolicies(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/discord/sanction-policies", {
        method: "GET",
        cache: "no-store",
      });

      const data = await parseJsonSafe<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo cargar la política de sanciones");
      }

      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Error desconocido";
      setError(message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadPolicies(true);
  }, []);

  function showStatus(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 2200);
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCategory.trim()) {
      return;
    }

    const response = await fetch("/api/discord/sanction-policies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newCategory.trim(),
      }),
    });

    const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "No se pudo crear la categoría");
      return;
    }

    setNewCategory("");
    showStatus("Categoría creada");
    await loadPolicies(false);
  }

  async function updateCategory() {
    if (!editingCategoryId || !editingCategoryName.trim()) {
      return;
    }

    const response = await fetch("/api/discord/sanction-policies", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingCategoryId,
        name: editingCategoryName.trim(),
      }),
    });

    const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "No se pudo actualizar la categoría");
      return;
    }

    setEditingCategoryId(null);
    setEditingCategoryName("");
    showStatus("Categoría actualizada");
    await loadPolicies(false);
  }

  async function deleteCategory(id: string) {
    const confirmed = window.confirm("¿Eliminar esta categoría y sus faltas? Esta acción desactiva ambos.");
    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/discord/sanction-policies", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "No se pudo eliminar la categoría");
      return;
    }

    showStatus("Categoría eliminada");
    await loadPolicies(false);
  }

  async function createInfraction(categoryId: string) {
    const fault = newFaultByCategory[categoryId]?.trim() ?? "";
    const sanction = newSanctionByCategory[categoryId]?.trim() ?? "Advertencia";
    const tags = (newTagsByCategory[categoryId] ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!fault || !sanction) {
      return;
    }

    const response = await fetch("/api/discord/sanction-policies/infractions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categoryId,
        fault,
        sanction,
        tags,
      }),
    });

    const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "No se pudo crear la falta");
      return;
    }

    setNewFaultByCategory((prev) => ({ ...prev, [categoryId]: "" }));
    setNewSanctionByCategory((prev) => ({ ...prev, [categoryId]: "Advertencia" }));
    setNewTagsByCategory((prev) => ({ ...prev, [categoryId]: "" }));
    showStatus("Falta creada");
    await loadPolicies(false);
  }

  async function updateInfraction() {
    if (!editingInfractionId || !editingFault.trim() || !editingSanction.trim()) {
      return;
    }

    const tags = editingTags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch("/api/discord/sanction-policies/infractions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingInfractionId,
        fault: editingFault.trim(),
        sanction: editingSanction.trim(),
        tags,
      }),
    });

    const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "No se pudo actualizar la falta");
      return;
    }

    setEditingInfractionId(null);
    setEditingFault("");
    setEditingSanction("");
    setEditingTags("");
    showStatus("Falta actualizada");
    await loadPolicies(false);
  }

  async function deleteInfraction(id: string) {
    const confirmed = window.confirm("¿Eliminar esta falta específica?");
    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/discord/sanction-policies/infractions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "No se pudo eliminar la falta");
      return;
    }

    showStatus("Falta eliminada");
    await loadPolicies(false);
  }

  return (
    <div className="space-y-6">
      <UICard className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-neutral-white)]">Categorías y faltas de sanción</h2>
            <p className="text-sm text-[var(--color-neutral-grey)]">
              Mantén actualizado el catálogo usado en Registrar Sanción.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-[var(--color-neutral-grey)]">
            Categorías: {categories.length} | Faltas: {totalInfractions}
          </div>
        </div>

        <form onSubmit={createCategory} className="flex flex-wrap items-end gap-2">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-xs text-[var(--color-neutral-grey)]">Nueva categoría</span>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ej: Profesionalismo en tickets"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/12 px-3 py-2 text-xs text-[#ffac00]"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar categoría
          </button>
        </form>

        {status ? (
          <div className="rounded-lg border border-[var(--color-accent-green)]/20 bg-[var(--color-accent-green)]/8 px-3 py-2 text-xs text-[var(--color-accent-green)]">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[var(--color-accent-red)]/20 bg-[var(--color-accent-red)]/8 px-3 py-2 text-xs text-[var(--color-accent-red)]">
            {error}
          </div>
        ) : null}
      </UICard>

      {loading ? (
        <UICard className="p-6 text-sm text-[var(--color-neutral-grey)]">Cargando política...</UICard>
      ) : categories.length === 0 ? (
        <UICard className="p-6 text-sm text-[var(--color-neutral-grey)]">
          No hay categorías configuradas todavía. Crea la primera categoría para comenzar.
        </UICard>
      ) : (
        categories.map((category) => (
          <UICard key={category.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {editingCategoryId === category.id ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="min-w-[240px] flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={updateCategory}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/12 px-3 py-2 text-xs text-[#ffac00]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setEditingCategoryName("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-neutral-grey)]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-neutral-white)]">{category.name}</p>
                    <p className="text-xs text-[var(--color-neutral-grey)]">Faltas: {category.infractions.length}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs text-blue-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCategory(category.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-3 py-2 text-xs text-[var(--color-accent-red)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              {category.infractions.length === 0 ? (
                <p className="text-xs text-[var(--color-neutral-grey)]">No hay faltas para esta categoría.</p>
              ) : (
                category.infractions.map((infraction) => {
                  const isEditing = editingInfractionId === infraction.id;
                  return (
                    <div key={infraction.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editingFault}
                            onChange={(e) => setEditingFault(e.target.value)}
                            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
                            placeholder="Falta específica"
                          />
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <select
                              value={editingSanction}
                              onChange={(e) => setEditingSanction(e.target.value)}
                              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
                              style={{ colorScheme: "dark" }}
                            >
                              {sanctionsCatalog.map((option) => (
                                <option key={option} value={option} className="bg-[#1a1a1a] text-[var(--color-neutral-white)]">
                                  {option}
                                </option>
                              ))}
                            </select>
                            <input
                              value={editingTags}
                              onChange={(e) => setEditingTags(e.target.value)}
                              placeholder="Tags separados por coma"
                              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={updateInfraction}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/12 px-3 py-2 text-xs text-[#ffac00]"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInfractionId(null);
                                setEditingFault("");
                                setEditingSanction("");
                                setEditingTags("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-neutral-grey)]"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm text-[var(--color-neutral-white)]">{infraction.fault}</p>
                            <p className="text-xs text-[var(--color-neutral-grey)]">
                              Sanción base: {infraction.sanction}
                            </p>
                            <p className="text-xs text-[var(--color-neutral-grey)]">
                              Tags: {infraction.tags.length > 0 ? infraction.tags.join(", ") : "-"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInfractionId(infraction.id);
                                setEditingFault(infraction.fault);
                                setEditingSanction(infraction.sanction);
                                setEditingTags(infraction.tags.join(", "));
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs text-blue-300"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteInfraction(infraction.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-3 py-2 text-xs text-[var(--color-accent-red)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="mb-2 text-xs text-[var(--color-neutral-grey)]">Agregar nueva falta a esta categoría</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <input
                  value={newFaultByCategory[category.id] ?? ""}
                  onChange={(e) =>
                    setNewFaultByCategory((prev) => ({
                      ...prev,
                      [category.id]: e.target.value,
                    }))
                  }
                  placeholder="Descripción de la falta"
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
                />
                <select
                  value={newSanctionByCategory[category.id] ?? "Advertencia"}
                  onChange={(e) =>
                    setNewSanctionByCategory((prev) => ({
                      ...prev,
                      [category.id]: e.target.value,
                    }))
                  }
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
                  style={{ colorScheme: "dark" }}
                >
                  {sanctionsCatalog.map((option) => (
                    <option key={option} value={option} className="bg-[#1a1a1a] text-[var(--color-neutral-white)]">
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  value={newTagsByCategory[category.id] ?? ""}
                  onChange={(e) =>
                    setNewTagsByCategory((prev) => ({
                      ...prev,
                      [category.id]: e.target.value,
                    }))
                  }
                  placeholder="Tags (coma)"
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-[var(--color-neutral-white)] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void createInfraction(category.id)}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/12 px-3 py-2 text-xs text-[#ffac00]"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar falta
              </button>
            </div>
          </UICard>
        ))
      )}
    </div>
  );
}
