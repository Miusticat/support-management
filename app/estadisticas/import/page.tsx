"use client";

import { useState } from "react";
import { Upload, CheckCircle, AlertCircle, ClipboardPaste, Eye } from "lucide-react";
import { cn } from "@/lib/stats/utils";
import type { TicketRecord, ImportResult } from "@/lib/stats/types";
import { parseTickets } from "@/lib/stats/parser";
import { PermissionGuard } from "@/app/components/stats/PermissionGuard";

type Step = "input" | "preview" | "result";

export default function ImportPage() {
  const [raw, setRaw] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [preview, setPreview] = useState<TicketRecord[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handlePreview() {
    setError(null);
    const tickets = parseTickets(raw);
    if (tickets.length === 0) {
      setError("No se encontraron tickets válidos. Verifica el formato de los datos.");
      return;
    }
    setPreview(tickets);
    setStep("preview");
  }

  async function handleImport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al importar");
      }
      const data: ImportResult = await res.json();
      setResult(data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setRaw("");
    setStep("input");
    setPreview([]);
    setResult(null);
    setError(null);
  }

  return (
    <PermissionGuard permission="can_import">
      <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar datos</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pega los datos del panel "Help Me" de GTA World para procesarlos.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3 text-sm">
        {(["input", "preview", "result"] as const).map((s, i) => {
          const labels = ["- Pegar datos", "- Verificar", "- Resultado"];
          const active = step === s;
          const done =
            (s === "input" && step !== "input") ||
            (s === "preview" && step === "result");
          return (
            <div
              key={s}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1",
                active && "bg-amber/15 text-amber",
                done && "text-green",
                !active && !done && "text-text-secondary"
              )}
            >
              {done ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
              <span>{labels[i]}</span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Input */}
      {step === "input" && (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={`Pega aquí los datos del panel Help Me...\n\nEjemplo:\n57930\tCuervo\tFaryen Marrian\tcomo trabajo en la empresa de camioneros?\t2026-03-11 19:28:27\tJoaquinAura`}
              rows={14}
              className="w-full rounded-lg border border-border bg-surface p-4 font-mono text-sm text-foreground placeholder:text-text-secondary/50 focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/30"
            />
            {!raw && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <ClipboardPaste className="h-12 w-12 text-text-secondary/20" />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handlePreview}
            disabled={!raw.trim()}
            className="flex items-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-amber/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium">
                {preview.length} ticket{preview.length !== 1 && "s"} detectado
                {preview.length !== 1 && "s"}
              </p>
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-left text-text-secondary">
                  <tr>
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Usuario</th>
                    <th className="px-4 py-2 font-medium">Personaje</th>
                    <th className="px-4 py-2 font-medium">Consulta</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Handler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-2 font-mono text-text-secondary">
                        {t.id}
                      </td>
                      <td className="px-4 py-2">{t.username}</td>
                      <td className="px-4 py-2">{t.character}</td>
                      <td className="max-w-xs truncate px-4 py-2">
                        {t.request}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-text-secondary">
                        {t.submittedAt}
                      </td>
                      <td className="px-4 py-2">
                        {t.handler ? (
                          <span className="text-green">{t.handler}</span>
                        ) : (
                          <span className="text-red">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("input")}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Volver
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-amber/90 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {loading ? "Importando..." : "Confirmar Importación"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green/30 bg-green/10 p-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-green" />
            <h2 className="mt-3 text-lg font-semibold">
              Importación completada
            </h2>
            <div className="mt-4 flex justify-center gap-8 text-sm">
              <div>
                <p className="text-2xl font-bold text-green">
                  {result.inserted}
                </p>
                <p className="text-text-secondary">Nuevos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-secondary">
                  {result.duplicates}
                </p>
                <p className="text-text-secondary">Duplicados</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-text-secondary">Total procesados</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Importar más datos
            </button>
            <a
              href="/"
              className="flex items-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-amber/90"
            >
              Ver dashboard
            </a>
          </div>
        </div>
      )}
      </div>
    </PermissionGuard>
  );
}
