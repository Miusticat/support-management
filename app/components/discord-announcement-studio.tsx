"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type EmbedField = {
  id: string;
  name: string;
  value: string;
  inline: boolean;
};

type PublishState = {
  loading: boolean;
  error: string | null;
  success: string | null;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function DiscordAnnouncementStudio() {
  const [title, setTitle] = useState("Patch Notes v1.3");
  const [description, setDescription] = useState(
    "Se habilito el nuevo sistema de tickets y panel de moderacion."
  );
  const [content, setContent] = useState("@everyone");
  const [colorHex, setColorHex] = useState("#8C73F8");
  const [url, setUrl] = useState("");
  const [authorName, setAuthorName] = useState("Support Management");
  const [authorIconUrl, setAuthorIconUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [footerText, setFooterText] = useState("GameShelf x Discord");
  const [footerIconUrl, setFooterIconUrl] = useState("");
  const [announceKey, setAnnounceKey] = useState("");
  const [fields, setFields] = useState<EmbedField[]>([
    {
      id: uid(),
      name: "Estado",
      value: "En linea",
      inline: true,
    },
    {
      id: uid(),
      name: "Version",
      value: "1.3.0",
      inline: true,
    },
  ]);
  const [publish, setPublish] = useState<PublishState>({
    loading: false,
    error: null,
    success: null,
  });

  const validFields = useMemo(
    () => fields.filter((field) => field.name.trim() && field.value.trim()),
    [fields]
  );

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: uid(), name: "", value: "", inline: false },
    ]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((field) => field.id !== id));
  }

  function updateField(id: string, next: Partial<EmbedField>) {
    setFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...next } : field))
    );
  }

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublish({ loading: true, error: null, success: null });

    try {
      const response = await fetch("/api/discord/announce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(announceKey.trim()
            ? {
                "x-announce-key": announceKey.trim(),
              }
            : {}),
        },
        body: JSON.stringify({
          title,
          description,
          content,
          colorHex,
          url: url || undefined,
          authorName: authorName || undefined,
          authorIconUrl: authorIconUrl || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          imageUrl: imageUrl || undefined,
          footerText: footerText || undefined,
          footerIconUrl: footerIconUrl || undefined,
          fields: validFields,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo publicar el anuncio");
      }

      setPublish({
        loading: false,
        error: null,
        success: "Anuncio enviado correctamente al canal de Discord.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setPublish({
        loading: false,
        error: message,
        success: null,
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <UICard className="xl:col-span-7 p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">
            Discord
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">
            Crear anuncio
          </h2>
          <p className="mt-2 text-sm text-[var(--color-neutral-grey)]">
            Editor estilo Discohook para construir embeds y publicarlos por webhook.
          </p>
        </div>

        <form onSubmit={publishAnnouncement} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Titulo</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Color HEX</span>
              <input
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
                placeholder="#8C73F8"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Descripcion</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Contenido (opcional)</span>
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
                placeholder="@everyone"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">URL del titulo</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Autor</span>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Avatar autor URL</span>
              <input
                value={authorIconUrl}
                onChange={(e) => setAuthorIconUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Thumbnail URL</span>
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Imagen URL</span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Footer</span>
              <input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Footer icon URL</span>
              <input
                value={footerIconUrl}
                onChange={(e) => setFooterIconUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">API Key (opcional)</span>
            <input
              value={announceKey}
              onChange={(e) => setAnnounceKey(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60"
              placeholder="x-announce-key"
            />
          </label>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--color-neutral-white)]">Campos del embed</p>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent-blue)]/40 bg-[var(--color-accent-blue)]/10 px-3 py-1.5 text-xs text-[var(--color-accent-sky)] transition-all duration-200 hover:bg-[var(--color-accent-blue)]/20"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar campo
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 p-3 sm:grid-cols-12">
                  <input
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60 sm:col-span-4"
                    placeholder="Nombre"
                  />
                  <input
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-sm outline-none focus:border-[var(--color-primary)]/60 sm:col-span-5"
                    placeholder="Valor"
                  />
                  <label className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-[var(--color-neutral-grey)] sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={field.inline}
                      onChange={(e) => updateField(field.id, { inline: e.target.checked })}
                    />
                    Inline
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] transition-all duration-200 hover:bg-[var(--color-accent-red)]/20 sm:col-span-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={publish.loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-primary)]/45 bg-gradient-to-r from-[var(--color-primary)]/35 to-[var(--color-accent-blue)]/20 px-4 py-2.5 text-sm font-medium text-[var(--color-neutral-white)] transition-all duration-200 hover:shadow-[0_0_18px_rgba(140,115,248,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {publish.loading ? "Publicando..." : "Publicar anuncio"}
          </button>

          {publish.error ? (
            <p className="text-sm text-[var(--color-accent-red)]">{publish.error}</p>
          ) : null}
          {publish.success ? (
            <p className="text-sm text-[var(--color-accent-green)]">{publish.success}</p>
          ) : null}
        </form>
      </UICard>

      <UICard className="xl:col-span-5 p-6">
        <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Preview</p>
        <div className="mt-3 rounded-xl border border-white/10 bg-[#2b2d31] p-4">
          {content ? <p className="mb-3 text-sm text-[#dbdee1]">{content}</p> : null}
          <div className="rounded-md border-l-4 p-4" style={{ borderLeftColor: colorHex || "#8C73F8", background: "#1f2124" }}>
            {authorName ? (
              <p className="text-xs font-medium text-[#dbdee1]">{authorName}</p>
            ) : null}
            <h3 className="mt-1 text-sm font-semibold text-[#00a8fc]">{title || "Titulo"}</h3>
            <p className="mt-2 text-sm text-[#dbdee1] whitespace-pre-wrap">
              {description || "Descripcion del anuncio"}
            </p>

            {validFields.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {validFields.map((field) => (
                  <div key={field.id} className={field.inline ? "sm:col-span-1" : "sm:col-span-2"}>
                    <p className="text-xs font-semibold text-[#ffffff]">{field.name}</p>
                    <p className="text-xs text-[#dbdee1]">{field.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {footerText ? (
              <p className="mt-4 text-[11px] text-[#949ba4]">{footerText}</p>
            ) : null}
          </div>
        </div>
      </UICard>
    </div>
  );
}
