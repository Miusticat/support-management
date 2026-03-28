"use client";

import { FormEvent, useMemo, useState } from "react";
import { ExternalLink, Plus, Send, Trash2 } from "lucide-react";
import { UICard } from "@/app/components/ui-card";

type EmbedField = {
  id: string;
  name: string;
  value: string;
  inline: boolean;
};

type ButtonEntry = {
  id: string;
  label: string;
  url: string;
  emoji: string;
};

type SectionEntry = {
  id: string;
  text: string;
  thumbnailUrl: string;
  buttonLabel: string;
  buttonUrl: string;
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
  const [contentAbove, setContentAbove] = useState("@everyone");
  const [accentColorHex, setAccentColorHex] = useState("#ffac00");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [footerText, setFooterText] = useState("GameShelf x Discord");
  const [buttons, setButtons] = useState<ButtonEntry[]>([]);
  const [sections, setSections] = useState<SectionEntry[]>([]);
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

  function addButton() {
    setButtons((prev) => [
      ...prev,
      { id: uid(), label: "", url: "", emoji: "" },
    ]);
  }

  function removeButton(id: string) {
    setButtons((prev) => prev.filter((b) => b.id !== id));
  }

  function updateButton(id: string, next: Partial<ButtonEntry>) {
    setButtons((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...next } : b))
    );
  }

  const validButtons = useMemo(
    () => buttons.filter((b) => b.label.trim() && b.url.trim()),
    [buttons]
  );

  function addSection() {
    setSections((prev) => [
      ...prev,
      { id: uid(), text: "", thumbnailUrl: "", buttonLabel: "", buttonUrl: "" },
    ]);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSection(id: string, next: Partial<SectionEntry>) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...next } : s))
    );
  }

  const validSections = useMemo(
    () => sections.filter((s) => s.text.trim()),
    [sections]
  );

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
          accentColorHex: accentColorHex || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          imageUrl: imageUrl || undefined,
          footerText: footerText || undefined,
          fields: validFields,
          buttons: validButtons.map((b) => ({
            label: b.label,
            url: b.url,
            style: 5 as const,
            emoji: b.emoji || undefined,
          })),
          sections: validSections.map((s) => ({
            text: s.text,
            thumbnailUrl: s.thumbnailUrl || undefined,
            buttonLabel: s.buttonLabel || undefined,
            buttonUrl: s.buttonUrl || undefined,
          })),
          contentAbove: contentAbove || undefined,
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
            Construye anuncios usando Components v2 de Discord y publicalos por webhook.
          </p>
        </div>

        <form onSubmit={publishAnnouncement} className="space-y-4">
          {/* Title + Accent color */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Titulo</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Color acento</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColorHex || "#ffac00"}
                  onChange={(e) => setAccentColorHex(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent p-0.5"
                />
                <input
                  value={accentColorHex}
                  onChange={(e) => setAccentColorHex(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
                  placeholder="#ffac00"
                />
              </div>
            </label>
          </div>

          {/* Description */}
          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Descripcion</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
              required
            />
          </label>

          {/* Content above + Thumbnail */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Texto encima del container</span>
              <input
                value={contentAbove}
                onChange={(e) => setContentAbove(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
                placeholder="@everyone"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Thumbnail URL</span>
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
              />
            </label>
          </div>

          {/* Image + Footer */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Imagen URL</span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Footer</span>
              <input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
              />
            </label>
          </div>

          {/* API Key */}
          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">API Key (opcional)</span>
            <input
              value={announceKey}
              onChange={(e) => setAnnounceKey(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]"
              placeholder="x-announce-key"
            />
          </label>

          {/* Fields editor */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--color-neutral-white)]">Campos</p>
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
                <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-white/[0.06] p-3 sm:grid-cols-12">
                  <input
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 sm:col-span-4"
                    placeholder="Nombre"
                  />
                  <input
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 sm:col-span-5"
                    placeholder="Valor"
                  />
                  <label className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-xs text-[var(--color-neutral-grey)] sm:col-span-2">
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

          {/* Sections editor */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--color-neutral-white)]">Secciones</p>
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent-blue)]/40 bg-[var(--color-accent-blue)]/10 px-3 py-1.5 text-xs text-[var(--color-accent-sky)] transition-all duration-200 hover:bg-[var(--color-accent-blue)]/20"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar seccion
              </button>
            </div>

            {sections.length === 0 ? (
              <p className="text-xs text-[var(--color-neutral-grey)]">Sin secciones. Cada seccion tiene texto y un accesorio (thumbnail o boton).</p>
            ) : (
              <div className="space-y-3">
                {sections.map((sec) => (
                  <div key={sec.id} className="space-y-2 rounded-lg border border-white/[0.06] p-3">
                    <div className="flex items-start gap-2">
                      <textarea
                        value={sec.text}
                        onChange={(e) => updateSection(sec.id, { text: e.target.value })}
                        className="min-h-16 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
                        placeholder="Texto de la seccion (markdown)"
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(sec.id)}
                        className="mt-1 inline-flex items-center justify-center rounded-lg border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/10 p-2 text-[var(--color-accent-red)] transition-all duration-200 hover:bg-[var(--color-accent-red)]/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input
                        value={sec.thumbnailUrl}
                        onChange={(e) => updateSection(sec.id, { thumbnailUrl: e.target.value })}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
                        placeholder="Thumbnail URL (opcional)"
                      />
                      <input
                        value={sec.buttonLabel}
                        onChange={(e) => updateSection(sec.id, { buttonLabel: e.target.value })}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
                        placeholder="Texto boton (opcional)"
                      />
                      <input
                        value={sec.buttonUrl}
                        onChange={(e) => updateSection(sec.id, { buttonUrl: e.target.value })}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
                        placeholder="URL boton (opcional)"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--color-neutral-grey)]">
                      {sec.thumbnailUrl ? "Accesorio: thumbnail" : sec.buttonUrl ? "Accesorio: boton link" : "Sin accesorio (se usara boton deshabilitado)"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons editor */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--color-neutral-white)]">Botones (link)</p>
              <button
                type="button"
                onClick={addButton}
                disabled={buttons.length >= 5}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent-blue)]/40 bg-[var(--color-accent-blue)]/10 px-3 py-1.5 text-xs text-[var(--color-accent-sky)] transition-all duration-200 hover:bg-[var(--color-accent-blue)]/20 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar boton
              </button>
            </div>

            {buttons.length === 0 ? (
              <p className="text-xs text-[var(--color-neutral-grey)]">Sin botones. Los botones aparecen como links al final del container.</p>
            ) : (
              <div className="space-y-3">
                {buttons.map((btn) => (
                  <div key={btn.id} className="grid grid-cols-1 gap-2 rounded-lg border border-white/[0.06] p-3 sm:grid-cols-12">
                    <input
                      value={btn.label}
                      onChange={(e) => updateButton(btn.id, { label: e.target.value })}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 sm:col-span-3"
                      placeholder="Texto"
                    />
                    <input
                      value={btn.url}
                      onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 sm:col-span-6"
                      placeholder="https://..."
                    />
                    <input
                      value={btn.emoji}
                      onChange={(e) => updateButton(btn.id, { emoji: e.target.value })}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 sm:col-span-2"
                      placeholder="Emoji"
                    />
                    <button
                      type="button"
                      onClick={() => removeButton(btn.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] transition-all duration-200 hover:bg-[var(--color-accent-red)]/20 sm:col-span-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={publish.loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#ffac00]/40 bg-[#ffac00]/20 px-4 py-2.5 text-sm font-medium text-[#ffac00] transition-all duration-200 hover:shadow-[0_0_18px_rgba(255,172,0,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* Components v2 Preview */}
      <UICard className="xl:col-span-5 p-6">
        <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Preview — Components v2</p>
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-4">
          {/* Content above the container */}
          {contentAbove ? <p className="mb-3 text-sm text-[#dbdee1]">{contentAbove}</p> : null}

          {/* Container with accent color */}
          <div
            className="overflow-hidden rounded-lg"
            style={{ background: "#1e1f22", borderLeft: `3px solid ${accentColorHex || "#ffac00"}` }}
          >
            <div className="p-4 space-y-3">
              {/* Title (with optional thumbnail) */}
              {title ? (
                thumbnailUrl ? (
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-[#f2f3f5]">{title}</h3>
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                ) : (
                  <h3 className="text-base font-bold text-[#f2f3f5]">{title}</h3>
                )
              ) : null}

              {/* Description */}
              {description ? (
                <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">{description}</p>
              ) : null}

              {/* Fields */}
              {validFields.length > 0 ? (
                <>
                  <div className="border-t border-white/[0.06]" />
                  <div className="space-y-1">
                    {validFields.map((field) => (
                      <p key={field.id} className="text-sm text-[#dbdee1]">
                        <span className="font-semibold text-[#f2f3f5]">{field.name}</span>
                        {"\n"}
                        {field.value}
                      </p>
                    ))}
                  </div>
                </>
              ) : null}

              {/* Sections */}
              {validSections.length > 0 ? (
                <>
                  {validSections.map((sec) => (
                    <div key={sec.id}>
                      <div className="border-t border-white/[0.06]" />
                      <div className="flex items-start justify-between gap-3 pt-3">
                        <p className="flex-1 text-sm text-[#dbdee1] whitespace-pre-wrap">{sec.text}</p>
                        {sec.thumbnailUrl ? (
                          <img
                            src={sec.thumbnailUrl}
                            alt=""
                            className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : sec.buttonUrl ? (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-[#4e5058] px-2.5 py-1 text-xs font-medium text-[#dbdee1] flex-shrink-0">
                            {sec.buttonLabel || "Abrir"}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-sm bg-[#4e5058]/50 px-2.5 py-1 text-xs text-[#949ba4] flex-shrink-0">
                            {sec.buttonLabel || "Info"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : null}

              {/* Image (Media Gallery) */}
              {imageUrl ? (
                <>
                  <div className="border-t border-transparent" />
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full rounded-md object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </>
              ) : null}

              {/* Buttons */}
              {validButtons.length > 0 ? (
                <>
                  <div className="border-t border-white/[0.06]" />
                  <div className="flex flex-wrap gap-2">
                    {validButtons.map((btn) => (
                      <span
                        key={btn.id}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-[#4e5058] px-3 py-1.5 text-xs font-medium text-[#dbdee1]"
                      >
                        {btn.emoji ? <span>{btn.emoji}</span> : null}
                        {btn.label}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </span>
                    ))}
                  </div>
                </>
              ) : null}

              {/* Footer */}
              {footerText ? (
                <>
                  <div className="border-t border-white/[0.06]" />
                  <p className="text-[11px] text-[#949ba4]">{footerText}</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </UICard>
    </div>
  );
}
