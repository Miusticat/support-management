"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import { PermissionGuard } from "@/app/components/stats/PermissionGuard";

interface DbInfo {
  totalTickets: number;
  totalResponded: number;
  uniqueHandlers: number;
  uniqueUsers: number;
  dateRange: { min: string; max: string } | null;
  dbSizeKb: number;
}

interface Perms {
  can_delete_range: boolean;
  can_delete_all: boolean;
}

export default function ManagePage() {
  const [info, setInfo] = useState<DbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState<Perms | null>(null);

  // Delete by range
  const [delFrom, setDelFrom] = useState("");
  const [delTo, setDelTo] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delResult, setDelResult] = useState<string | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  // Delete all
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const [infoRes, meRes] = await Promise.all([
        fetch("/api/data"),
        fetch("/api/auth/me"),
      ]);
      setInfo(await infoRes.json());
      const me = await meRes.json();
      if (me.permissions) setPerms(me.permissions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  async function handleDeleteRange() {
    if (!delFrom || !delTo) return;
    setDeleting(true);
    setDelResult(null);
    setDelError(null);
    try {
      const res = await fetch(
        `/api/data?from=${encodeURIComponent(delFrom)}&to=${encodeURIComponent(delTo)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setDelError(data.error || "Error al eliminar");
        return;
      }
      setDelResult(`${data.deleted} ticket(s) eliminados.`);
      fetchInfo();
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    if (confirmText !== "ELIMINAR TODO") return;
    setDeletingAll(true);
    setDelResult(null);
    setDelError(null);
    try {
      const res = await fetch("/api/data?all=true", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDelError(data.error || "Error al eliminar");
        return;
      }
      setDelResult(`${data.deleted} ticket(s) eliminados. Base de datos vaciada.`);
      setConfirmAll(false);
      setConfirmText("");
      fetchInfo();
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <PermissionGuard permission="can_import">
      <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestión de datos</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Información de la base de datos y herramientas de limpieza
        </p>
      </div>

      {/* DB Info */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-amber" />
          <h2 className="font-semibold">Estado de la base de datos</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : info ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Total tickets" value={info.totalTickets.toLocaleString()} />
            <Stat label="Respondidos" value={info.totalResponded.toLocaleString()} />
            <Stat label="Handlers" value={info.uniqueHandlers.toLocaleString()} />
            <Stat label="Usuarios únicos" value={info.uniqueUsers.toLocaleString()} />
            <Stat
              label="Rango de fechas"
              value={
                info.dateRange
                  ? `${info.dateRange.min.slice(0, 10)} → ${info.dateRange.max.slice(0, 10)}`
                  : "Sin datos"
              }
            />
            <Stat label="Tamaño DB" value={`${info.dbSizeKb} KB`} />
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No se pudo cargar la información.</p>
        )}
      </div>

      {/* Delete by range */}
      {perms?.can_delete_range ? (
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Eliminar por rango de fechas</h2>
          <p className="mb-4 text-xs text-text-secondary">
            Elimina todos los tickets en el rango especificado. Esto no se puede deshacer.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Desde</label>
              <input
                type="date"
                value={delFrom}
                onChange={(e) => setDelFrom(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-amber focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Hasta</label>
              <input
                type="date"
                value={delTo}
                onChange={(e) => setDelTo(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-amber focus:outline-none"
              />
            </div>
            <button
              onClick={handleDeleteRange}
              disabled={deleting || !delFrom || !delTo}
              className="flex items-center gap-2 rounded-lg bg-red/10 px-4 py-2 text-sm font-medium text-red transition-colors hover:bg-red/20 disabled:opacity-40"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar rango
            </button>
          </div>
        </div>
      ) : perms ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-5 text-sm text-text-secondary">
          <ShieldAlert className="h-4 w-4" />
          No tienes permiso para eliminar datos por rango.
        </div>
      ) : null}

      {/* Delete all */}
      {perms?.can_delete_all ? (
        <div className="rounded-lg border border-red/30 bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red" />
            <h2 className="font-semibold text-red">Zona de peligro</h2>
          </div>
          <p className="mb-4 text-xs text-text-secondary">
            Elimina TODOS los tickets de la base de datos. Esta acción no se puede deshacer.
          </p>

          {!confirmAll ? (
            <button
              onClick={() => setConfirmAll(true)}
              className="rounded-lg bg-red/10 px-4 py-2 text-sm font-medium text-red transition-colors hover:bg-red/20"
            >
              Vaciar base de datos
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red">
                Escribe <strong>ELIMINAR TODO</strong> para confirmar:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR TODO"
                autoFocus
                className="w-full max-w-xs rounded-lg border border-red/30 bg-background py-2 px-4 text-sm text-foreground placeholder:text-text-secondary/60 focus:border-red focus:outline-none focus:ring-1 focus:ring-red/50"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll || confirmText !== "ELIMINAR TODO"}
                  className="flex items-center gap-2 rounded-lg bg-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red/80 disabled:opacity-50"
                >
                  {deletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Sí, eliminar todo
                </button>
                <button
                  onClick={() => { setConfirmAll(false); setConfirmText(""); }}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Error banner */}
      {delError && (
        <div className="flex items-center gap-2 rounded-lg border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {delError}
        </div>
      )}

      {/* Result banner */}
      {delResult && (
        <div className="flex items-center gap-2 rounded-lg border border-green/30 bg-green/5 px-4 py-3 text-sm text-green">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {delResult}
        </div>
      )}
      </div>
    </PermissionGuard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/50 px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
