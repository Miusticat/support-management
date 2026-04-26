"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ScrollText,
  Loader2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface AuditEntry {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "Inicio de sesión", color: "text-green" },
  login_failed: { label: "Login fallido", color: "text-red" },
  logout: { label: "Cierre de sesión", color: "text-text-secondary" },
  import_data: { label: "Importación", color: "text-amber" },
  delete_range: { label: "Eliminar rango", color: "text-red" },
  delete_all: { label: "Eliminar todo", color: "text-red" },
  export_data: { label: "Exportación", color: "text-text-secondary" },
  user_create: { label: "Usuario creado", color: "text-green" },
  user_update: { label: "Usuario editado", color: "text-amber" },
  user_delete: { label: "Usuario eliminado", color: "text-red" },
  user_password_change: { label: "Cambio de contraseña", color: "text-amber" },
  permission_change: { label: "Cambio de permisos", color: "text-amber" },
  totp_enabled: { label: "2FA activado", color: "text-green" },
  totp_disabled: { label: "2FA desactivado", color: "text-red" },
  totp_reset: { label: "2FA restablecido", color: "text-amber" },
};

const PAGE_SIZE = 30;

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/audit?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`;
      if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`;
      if (usernameFilter) url += `&username=${encodeURIComponent(usernameFilter)}`;

      const res = await fetch(url);
      if (res.status === 403) {
        setHasAccess(false);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, usernameFilter]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <Shield className="mx-auto h-10 w-10 text-text-secondary/30" />
        <p className="mt-4 text-sm text-text-secondary">
          No tienes permiso para ver el registro de auditoría.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registro de auditoría</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Historial completo de todas las acciones en el sistema
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-text-secondary" />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          value={usernameFilter}
          onChange={(e) => { setUsernameFilter(e.target.value); setPage(0); }}
          placeholder="Filtrar por usuario..."
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-text-secondary/60 focus:border-amber focus:outline-none"
        />
        <span className="text-xs text-text-secondary">
          {total} registro{total !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-16">
          <ScrollText className="h-10 w-10 text-text-secondary/30" />
          <p className="mt-4 text-sm text-text-secondary">
            No hay registros de auditoría.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-active text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Acción</th>
                <th className="px-4 py-3 font-medium">Detalles</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const actionInfo = ACTION_LABELS[entry.action] || {
                  label: entry.action,
                  color: "text-text-secondary",
                };
                return (
                  <tr key={entry.id} className="hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">
                      {new Date(entry.created_at).toLocaleString("es", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {entry.username}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${actionInfo.color}`}>
                        {actionInfo.label}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-text-secondary">
                      {entry.details
                        ? Object.entries(entry.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-secondary">
                      {entry.ip_address || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-surface-hover disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-surface-hover disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
