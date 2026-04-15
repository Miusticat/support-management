"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";

export function PostulacionesSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [deadline, setDeadline] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function loadSettings() {
    try {
      const response = await fetch("/api/discord/postulaciones-settings", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No se pudo cargar la configuración");
      }

      const data = await response.json();
      if (data.votingDeadline) {
        const date = new Date(data.votingDeadline);
        const iso = date.toISOString().slice(0, 16);
        setDeadline(iso);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function handleOpen() {
    setIsOpen(true);
    setError(null);
    setSuccess(false);
    await loadSettings();
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/discord/postulaciones-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          votingDeadlineIso: deadline ? new Date(deadline).toISOString() : null,
        }),
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al guardar");
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-lg border border-[#ffac00]/40 bg-[#ffac00]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffac00] transition-colors hover:bg-[#ffac00]/20"
      >
        <Settings className="h-3.5 w-3.5" />
        Configurar votación
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative max-w-md w-full mx-4 rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-[var(--color-neutral-grey)] hover:text-[var(--color-neutral-white)]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-semibold text-[var(--color-neutral-white)]">
              Configurar votación
            </h3>
            <p className="mt-1 text-xs text-[var(--color-neutral-grey)]">
              Establece la fecha y hora límite para que los evaluadores voten
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)]">
                  Fecha y hora límite
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-white/[0.05] px-3 py-2 text-sm text-[var(--color-neutral-white)] focus:outline-none focus:ring-1 focus:ring-[#ffac00]"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-[#fb7185]/12 p-3 text-xs text-[#ffc3cd]">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-[#34d399]/12 p-3 text-xs text-[#b9f5df]">
                  Configuración guardada correctamente
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-[var(--color-neutral-grey)]/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-neutral-grey)] transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[#ffac00]/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffac00] transition-colors hover:bg-[#ffac00]/60 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
