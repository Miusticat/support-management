"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Grid3X3,
  Image as ImageIcon,
  LayoutList,
  Link2,
  Minus,
  MoveDown,
  MoveUp,
  Plus,
  Send,
  Settings2,
  Trash2,
  Type,
} from "lucide-react";
import { UICard } from "@/app/components/ui-card";

/* ─── Types ────────────────────────────────────────────── */

type TextBlock = { type: "text"; id: string; content: string };
type FieldsBlock = {
  type: "fields";
  id: string;
  fields: Array<{ id: string; name: string; value: string; inline: boolean }>;
};
type SectionBlock = {
  type: "section";
  id: string;
  text: string;
  accessoryType: "thumbnail" | "button";
  thumbnailUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  buttonEmoji: string;
};
type SeparatorBlock = {
  type: "separator";
  id: string;
  divider: boolean;
  spacing: 1 | 2;
};
type MediaGalleryBlock = {
  type: "media-gallery";
  id: string;
  items: Array<{ id: string; url: string; description: string }>;
};
type ActionRowBlock = {
  type: "action-row";
  id: string;
  buttons: Array<{ id: string; label: string; url: string; emoji: string }>;
};

type Block =
  | TextBlock
  | FieldsBlock
  | SectionBlock
  | SeparatorBlock
  | MediaGalleryBlock
  | ActionRowBlock;

type PublishState = {
  loading: boolean;
  error: string | null;
  success: string | null;
};

/* ─── Style constants ──────────────────────────────────── */

const INPUT =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40 focus:shadow-[0_0_16px_rgba(255,172,0,0.06)]";
const INPUT_SM =
  "rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40";
const LABEL = "text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]";
const ADD_BTN =
  "inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent-blue)]/40 bg-[var(--color-accent-blue)]/10 px-3 py-1.5 text-xs text-[var(--color-accent-sky)] transition-all duration-200 hover:bg-[var(--color-accent-blue)]/20 disabled:opacity-40";
const DEL_BTN =
  "inline-flex items-center justify-center rounded-lg border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] transition-all duration-200 hover:bg-[var(--color-accent-red)]/20";
const MOVE_BTN =
  "inline-flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5 text-[var(--color-neutral-grey)] transition-all hover:text-[var(--color-neutral-white)] hover:bg-white/[0.06] disabled:opacity-30";
const GROUP = "rounded-xl border border-white/[0.06] bg-white/[0.02] p-4";
const SELECT =
  "rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#ffac00]/40 appearance-none cursor-pointer";

/* ─── Helpers ──────────────────────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const BLOCK_DEFS = [
  { type: "text" as const, label: "Texto", icon: Type },
  { type: "fields" as const, label: "Campos", icon: Grid3X3 },
  { type: "section" as const, label: "Seccion", icon: LayoutList },
  { type: "separator" as const, label: "Separador", icon: Minus },
  { type: "media-gallery" as const, label: "Galeria", icon: ImageIcon },
  { type: "action-row" as const, label: "Botones", icon: Link2 },
] as const;

/* ─── Collapsible Section ──────────────────────────────── */

function Collapsible({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={GROUP}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-neutral-white)]">
          {Icon && <Icon className="h-4 w-4 text-[var(--color-neutral-grey)]" />}
          {title}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-[var(--color-neutral-grey)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--color-neutral-grey)]" />
        )}
      </button>
      {open && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );
}

export function DiscordAnnouncementStudio() {
  /* ─── Header state ─────────────────────────────────── */
  const [title, setTitle] = useState("Patch Notes v1.3");
  const [description, setDescription] = useState(
    "Se habilito el nuevo sistema de tickets y panel de moderacion."
  );
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  /* ─── Container settings ───────────────────────────── */
  const [accentColorHex, setAccentColorHex] = useState("#ffac00");
  const [spoiler, setSpoiler] = useState(false);

  /* ─── Footer ───────────────────────────────────────── */
  const [footerText, setFooterText] = useState("GTA World ES");

  /* ─── General settings ─────────────────────────────── */
  const [contentAbove, setContentAbove] = useState("@everyone");
  const [webhookUsername, setWebhookUsername] = useState("");
  const [webhookAvatarUrl, setWebhookAvatarUrl] = useState("");
  const [announceKey, setAnnounceKey] = useState("");

  /* ─── Blocks ───────────────────────────────────────── */
  const [blocks, setBlocks] = useState<Block[]>([]);

  /* ─── Publish ──────────────────────────────────────── */
  const [publish, setPublish] = useState<PublishState>({
    loading: false,
    error: null,
    success: null,
  });

  /* ─── Block CRUD ───────────────────────────────────── */

  function addBlock(type: Block["type"]) {
    const id = uid();
    let block: Block;
    switch (type) {
      case "text":
        block = { type: "text", id, content: "" };
        break;
      case "fields":
        block = {
          type: "fields",
          id,
          fields: [{ id: uid(), name: "", value: "", inline: false }],
        };
        break;
      case "section":
        block = {
          type: "section",
          id,
          text: "",
          accessoryType: "thumbnail",
          thumbnailUrl: "",
          buttonLabel: "",
          buttonUrl: "",
          buttonEmoji: "",
        };
        break;
      case "separator":
        block = { type: "separator", id, divider: true, spacing: 1 };
        break;
      case "media-gallery":
        block = {
          type: "media-gallery",
          id,
          items: [{ id: uid(), url: "", description: "" }],
        };
        break;
      case "action-row":
        block = {
          type: "action-row",
          id,
          buttons: [{ id: uid(), label: "", url: "", emoji: "" }],
        };
        break;
    }
    setBlocks((prev) => [...prev, block]);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, direction: "up" | "down") {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index < 0) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }

  function updateBlock(id: string, updates: Partial<Block>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...updates } as Block) : b))
    );
  }

  /* ─── Fields sub-CRUD ──────────────────────────────── */

  function addFieldToBlock(blockId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "fields"
          ? {
              ...b,
              fields: [
                ...b.fields,
                { id: uid(), name: "", value: "", inline: false },
              ],
            }
          : b
      )
    );
  }

  function removeFieldFromBlock(blockId: string, fieldId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "fields"
          ? { ...b, fields: b.fields.filter((f) => f.id !== fieldId) }
          : b
      )
    );
  }

  function updateFieldInBlock(
    blockId: string,
    fieldId: string,
    updates: Partial<FieldsBlock["fields"][number]>
  ) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "fields"
          ? {
              ...b,
              fields: b.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : b
      )
    );
  }

  /* ─── Gallery sub-CRUD ─────────────────────────────── */

  function addImageToBlock(blockId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "media-gallery"
          ? {
              ...b,
              items: [...b.items, { id: uid(), url: "", description: "" }],
            }
          : b
      )
    );
  }

  function removeImageFromBlock(blockId: string, itemId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "media-gallery"
          ? { ...b, items: b.items.filter((i) => i.id !== itemId) }
          : b
      )
    );
  }

  function updateImageInBlock(
    blockId: string,
    itemId: string,
    updates: Partial<MediaGalleryBlock["items"][number]>
  ) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "media-gallery"
          ? {
              ...b,
              items: b.items.map((i) =>
                i.id === itemId ? { ...i, ...updates } : i
              ),
            }
          : b
      )
    );
  }

  /* ─── Button sub-CRUD ──────────────────────────────── */

  function addButtonToBlock(blockId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "action-row"
          ? {
              ...b,
              buttons: [
                ...b.buttons,
                { id: uid(), label: "", url: "", emoji: "" },
              ],
            }
          : b
      )
    );
  }

  function removeButtonFromBlock(blockId: string, btnId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "action-row"
          ? { ...b, buttons: b.buttons.filter((btn) => btn.id !== btnId) }
          : b
      )
    );
  }

  function updateButtonInBlock(
    blockId: string,
    btnId: string,
    updates: Partial<ActionRowBlock["buttons"][number]>
  ) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === "action-row"
          ? {
              ...b,
              buttons: b.buttons.map((btn) =>
                btn.id === btnId ? { ...btn, ...updates } : btn
              ),
            }
          : b
      )
    );
  }

  /* ─── Serialize blocks for API ─────────────────────── */

  function serializeBlock(block: Block) {
    switch (block.type) {
      case "text":
        return { type: "text" as const, content: block.content };
      case "fields":
        return {
          type: "fields" as const,
          fields: block.fields
            .filter((f) => f.name.trim() && f.value.trim())
            .map((f) => ({ name: f.name, value: f.value, inline: f.inline })),
        };
      case "section":
        return {
          type: "section" as const,
          text: block.text,
          accessoryType: block.accessoryType,
          thumbnailUrl: block.thumbnailUrl || undefined,
          buttonLabel: block.buttonLabel || undefined,
          buttonUrl: block.buttonUrl || undefined,
          buttonEmoji: block.buttonEmoji || undefined,
        };
      case "separator":
        return {
          type: "separator" as const,
          divider: block.divider,
          spacing: block.spacing,
        };
      case "media-gallery":
        return {
          type: "media-gallery" as const,
          items: block.items
            .filter((i) => i.url.trim())
            .map((i) => ({
              url: i.url,
              description: i.description || undefined,
            })),
        };
      case "action-row":
        return {
          type: "action-row" as const,
          buttons: block.buttons
            .filter((b) => b.label.trim() && b.url.trim())
            .map((b) => ({
              label: b.label,
              url: b.url,
              emoji: b.emoji || undefined,
            })),
        };
    }
  }

  /* ─── Publish handler ──────────────────────────────── */

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublish({ loading: true, error: null, success: null });

    try {
      const response = await fetch("/api/discord/announce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(announceKey.trim()
            ? { "x-announce-key": announceKey.trim() }
            : {}),
        },
        body: JSON.stringify({
          title: title || undefined,
          description: description || undefined,
          accentColorHex: accentColorHex || undefined,
          spoiler,
          thumbnailUrl: thumbnailUrl || undefined,
          footerText: footerText || undefined,
          contentAbove: contentAbove || undefined,
          webhookUsername: webhookUsername || undefined,
          webhookAvatarUrl: webhookAvatarUrl || undefined,
          blocks: blocks.map(serializeBlock),
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
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      setPublish({ loading: false, error: message, success: null });
    }
  }

  /* ─── Computed values for preview ──────────────────── */

  const previewBlocks = useMemo(() => {
    return blocks.map(serializeBlock);
  }, [blocks]);

  /* ─── Render helpers for blocks ────────────────────── */

  function renderBlockForm(block: Block, index: number) {
    const def = BLOCK_DEFS.find((d) => d.type === block.type)!;
    const Icon = def.icon;

    return (
      <div
        key={block.id}
        className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden"
      >
        {/* Block header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-[var(--color-neutral-white)]">
            <Icon className="h-3.5 w-3.5 text-[var(--color-accent-sky)]" />
            {def.label}
            <span className="text-[10px] text-[var(--color-neutral-grey)]">
              #{index + 1}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => moveBlock(block.id, "up")}
              className={MOVE_BTN}
            >
              <MoveUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={index === blocks.length - 1}
              onClick={() => moveBlock(block.id, "down")}
              className={MOVE_BTN}
            >
              <MoveDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              className={`${DEL_BTN} p-1.5`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Block body */}
        <div className="p-4 space-y-3">
          {block.type === "text" && (
            <textarea
              value={block.content}
              onChange={(e) =>
                updateBlock(block.id, { content: e.target.value })
              }
              className={`min-h-20 ${INPUT}`}
              placeholder="Texto con markdown (negrita, cursiva, listas, etc.)"
            />
          )}

          {block.type === "fields" && (
            <>
              <div className="space-y-2">
                {block.fields.map((field) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-12"
                  >
                    <input
                      value={field.name}
                      onChange={(e) =>
                        updateFieldInBlock(block.id, field.id, {
                          name: e.target.value,
                        })
                      }
                      className={`${INPUT_SM} sm:col-span-4`}
                      placeholder="Nombre"
                    />
                    <input
                      value={field.value}
                      onChange={(e) =>
                        updateFieldInBlock(block.id, field.id, {
                          value: e.target.value,
                        })
                      }
                      className={`${INPUT_SM} sm:col-span-5`}
                      placeholder="Valor"
                    />
                    <label className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-xs text-[var(--color-neutral-grey)] sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={field.inline}
                        onChange={(e) =>
                          updateFieldInBlock(block.id, field.id, {
                            inline: e.target.checked,
                          })
                        }
                      />
                      Inline
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        removeFieldFromBlock(block.id, field.id)
                      }
                      className={`${DEL_BTN} sm:col-span-1`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addFieldToBlock(block.id)}
                className={ADD_BTN}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar campo
              </button>
            </>
          )}

          {block.type === "section" && (
            <>
              <textarea
                value={block.text}
                onChange={(e) =>
                  updateBlock(block.id, { text: e.target.value })
                }
                className={`min-h-16 ${INPUT}`}
                placeholder="Texto de la seccion (markdown)"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className={LABEL}>Tipo de accesorio</span>
                  <select
                    value={block.accessoryType}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        accessoryType: e.target.value as "thumbnail" | "button",
                      })
                    }
                    className={`w-full ${SELECT}`}
                  >
                    <option value="thumbnail">Thumbnail (imagen)</option>
                    <option value="button">Boton link</option>
                  </select>
                </label>
                {block.accessoryType === "thumbnail" ? (
                  <label className="space-y-1.5">
                    <span className={LABEL}>Thumbnail URL</span>
                    <input
                      value={block.thumbnailUrl}
                      onChange={(e) =>
                        updateBlock(block.id, {
                          thumbnailUrl: e.target.value,
                        })
                      }
                      className={INPUT}
                      placeholder="https://..."
                    />
                  </label>
                ) : (
                  <>
                    <label className="space-y-1.5">
                      <span className={LABEL}>Texto del boton</span>
                      <input
                        value={block.buttonLabel}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            buttonLabel: e.target.value,
                          })
                        }
                        className={INPUT}
                        placeholder="Abrir"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className={LABEL}>URL del boton</span>
                      <input
                        value={block.buttonUrl}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            buttonUrl: e.target.value,
                          })
                        }
                        className={INPUT}
                        placeholder="https://..."
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className={LABEL}>Emoji (opcional)</span>
                      <input
                        value={block.buttonEmoji}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            buttonEmoji: e.target.value,
                          })
                        }
                        className={INPUT}
                        placeholder="🔗"
                      />
                    </label>
                  </>
                )}
              </div>
            </>
          )}

          {block.type === "separator" && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-[var(--color-neutral-grey)]">
                <input
                  type="checkbox"
                  checked={block.divider}
                  onChange={(e) =>
                    updateBlock(block.id, { divider: e.target.checked })
                  }
                />
                Mostrar linea
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--color-neutral-grey)]">
                Espaciado:
                <select
                  value={block.spacing}
                  onChange={(e) =>
                    updateBlock(block.id, {
                      spacing: Number(e.target.value) as 1 | 2,
                    })
                  }
                  className={SELECT}
                >
                  <option value={1}>Compacto</option>
                  <option value={2}>Grande</option>
                </select>
              </label>
            </div>
          )}

          {block.type === "media-gallery" && (
            <>
              <div className="space-y-2">
                {block.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-12"
                  >
                    <input
                      value={item.url}
                      onChange={(e) =>
                        updateImageInBlock(block.id, item.id, {
                          url: e.target.value,
                        })
                      }
                      className={`${INPUT_SM} sm:col-span-6`}
                      placeholder="URL de la imagen"
                    />
                    <input
                      value={item.description}
                      onChange={(e) =>
                        updateImageInBlock(block.id, item.id, {
                          description: e.target.value,
                        })
                      }
                      className={`${INPUT_SM} sm:col-span-5`}
                      placeholder="Descripcion / alt text"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeImageFromBlock(block.id, item.id)
                      }
                      className={`${DEL_BTN} sm:col-span-1`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addImageToBlock(block.id)}
                disabled={block.items.length >= 10}
                className={ADD_BTN}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar imagen
              </button>
              <p className="text-[10px] text-[var(--color-neutral-grey)]">
                Hasta 10 imagenes por galeria.
              </p>
            </>
          )}

          {block.type === "action-row" && (
            <>
              <div className="space-y-2">
                {block.buttons.map((btn) => (
                  <div
                    key={btn.id}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-12"
                  >
                    <input
                      value={btn.label}
                      onChange={(e) =>
                        updateButtonInBlock(block.id, btn.id, {
                          label: e.target.value,
                        })
                      }
                      className={`${INPUT_SM} sm:col-span-3`}
                      placeholder="Texto"
                    />
                    <input
                      value={btn.url}
                      onChange={(e) =>
                        updateButtonInBlock(block.id, btn.id, {
                          url: e.target.value,
                        })
                      }
                      className={`${INPUT_SM} sm:col-span-6`}
                      placeholder="https://..."
                    />
                    <input
                      value={btn.emoji}
                      onChange={(e) =>
                        updateButtonInBlock(block.id, btn.id, {
                          emoji: e.target.value,
                        })
                      }
                      className={`${INPUT_SM} sm:col-span-2`}
                      placeholder="Emoji"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeButtonFromBlock(block.id, btn.id)
                      }
                      className={`${DEL_BTN} sm:col-span-1`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addButtonToBlock(block.id)}
                disabled={block.buttons.length >= 5}
                className={ADD_BTN}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar boton
              </button>
              <p className="text-[10px] text-[var(--color-neutral-grey)]">
                Max. 5 botones por fila. Todos son link buttons (abren URL).
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ─── Preview helpers ──────────────────────────────── */

  function renderBlockPreview(
    block: ReturnType<typeof serializeBlock>,
    index: number,
    allBlocks: ReturnType<typeof serializeBlock>[]
  ) {
    const prev = index > 0 ? allBlocks[index - 1] : null;
    const showAutoSep =
      index > 0 &&
      block.type !== "separator" &&
      prev?.type !== "separator";

    return (
      <div key={index}>
        {showAutoSep && (
          <div className="border-t border-white/[0.06] my-2" />
        )}

        {block.type === "text" && block.content?.trim() && (
          <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">
            {block.content}
          </p>
        )}

        {block.type === "fields" &&
          block.fields &&
          block.fields.length > 0 && (
            <div className="space-y-1">
              {block.fields.map(
                (
                  f: { name: string; value: string; inline?: boolean },
                  fi: number
                ) => (
                  <p key={fi} className="text-sm text-[#dbdee1]">
                    <span className="font-semibold text-[#f2f3f5]">
                      {f.name}
                    </span>
                    {"\n"}
                    {f.value}
                  </p>
                )
              )}
            </div>
          )}

        {block.type === "section" && block.text?.trim() && (
          <div className="flex items-start justify-between gap-3 pt-1">
            <p className="flex-1 text-sm text-[#dbdee1] whitespace-pre-wrap">
              {block.text}
            </p>
            {block.accessoryType === "thumbnail" && block.thumbnailUrl ? (
              <img
                src={block.thumbnailUrl}
                alt=""
                className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : block.accessoryType === "button" && block.buttonUrl ? (
              <span className="inline-flex items-center gap-1 rounded-sm bg-[#4e5058] px-2.5 py-1 text-xs font-medium text-[#dbdee1] flex-shrink-0">
                {block.buttonEmoji && <span>{block.buttonEmoji}</span>}
                {block.buttonLabel || "Abrir"}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </span>
            ) : (
              <span className="inline-flex items-center rounded-sm bg-[#4e5058]/50 px-2.5 py-1 text-xs text-[#949ba4] flex-shrink-0">
                {block.buttonLabel || "Info"}
              </span>
            )}
          </div>
        )}

        {block.type === "separator" && (
          <div
            className={`${block.divider ? "border-t border-white/[0.06]" : ""} ${block.spacing === 2 ? "my-4" : "my-2"}`}
          />
        )}

        {block.type === "media-gallery" &&
          block.items &&
          block.items.length > 0 && (
            <div
              className={`grid gap-2 ${block.items.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
            >
              {block.items.map(
                (
                  item: { url: string; description?: string },
                  ii: number
                ) => (
                  <img
                    key={ii}
                    src={item.url}
                    alt={item.description || ""}
                    className="w-full rounded-md object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )
              )}
            </div>
          )}

        {block.type === "action-row" &&
          block.buttons &&
          block.buttons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {block.buttons.map(
                (
                  btn: { label: string; url: string; emoji?: string },
                  bi: number
                ) => (
                  <span
                    key={bi}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-[#4e5058] px-3 py-1.5 text-xs font-medium text-[#dbdee1]"
                  >
                    {btn.emoji && <span>{btn.emoji}</span>}
                    {btn.label}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </span>
                )
              )}
            </div>
          )}
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* ────────────────── FORM PANEL ────────────────── */}
      <UICard className="xl:col-span-7 p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">
            Discord
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">
            Crear anuncio
          </h2>
          <p className="mt-2 text-sm text-[var(--color-neutral-grey)]">
            Construye anuncios usando Components v2 de Discord con bloques de
            contenido, galerias, secciones, separadores y botones link.
          </p>
        </div>

        <form onSubmit={publishAnnouncement} className="space-y-4">
          {/* ───── Container settings ───── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="space-y-2">
              <span className={LABEL}>Color acento</span>
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
                  className={INPUT}
                  placeholder="#ffac00"
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className={LABEL}>Contenido encima</span>
              <input
                value={contentAbove}
                onChange={(e) => setContentAbove(e.target.value)}
                className={INPUT}
                placeholder="@everyone"
              />
            </label>
            <label className="flex items-end gap-3 pb-0.5">
              <span className="flex items-center gap-2 text-sm text-[var(--color-neutral-grey)]">
                <input
                  type="checkbox"
                  checked={spoiler}
                  onChange={(e) => setSpoiler(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Container spoiler
              </span>
            </label>
          </div>

          {/* ───── Header ───── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={LABEL}>Titulo</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT}
              />
            </label>
            <label className="space-y-2">
              <span className={LABEL}>Thumbnail URL</span>
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className={INPUT}
                placeholder="Imagen junto al titulo"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className={LABEL}>Descripcion</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`min-h-24 ${INPUT}`}
            />
          </label>

          {/* ───── Component Blocks ───── */}
          <div className={GROUP}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-[var(--color-neutral-white)]">
                Bloques de componentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_DEFS.map((def) => (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => addBlock(def.type)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-[var(--color-neutral-grey)] transition-all hover:border-[#ffac00]/30 hover:text-[var(--color-accent-sky)] hover:bg-[#ffac00]/5"
                  >
                    <def.icon className="h-3 w-3" />
                    {def.label}
                  </button>
                ))}
              </div>
            </div>

            {blocks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.06] py-8 text-center">
                <p className="text-xs text-[var(--color-neutral-grey)]">
                  Sin bloques. Agrega bloques para construir el cuerpo del
                  anuncio.
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-neutral-grey)]/60">
                  Los bloques aparecen entre el encabezado y el pie del
                  container. Se agregan separadores automaticos entre ellos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, index) =>
                  renderBlockForm(block, index)
                )}
              </div>
            )}
          </div>

          {/* ───── Footer ───── */}
          <label className="space-y-2 block">
            <span className={LABEL}>Footer</span>
            <input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className={INPUT}
            />
          </label>

          {/* ───── Advanced settings ───── */}
          <Collapsible title="Ajustes avanzados" icon={Settings2} defaultOpen={false}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className={LABEL}>Webhook nombre</span>
                <input
                  value={webhookUsername}
                  onChange={(e) => setWebhookUsername(e.target.value)}
                  className={INPUT}
                  placeholder="Nombre personalizado del bot"
                />
              </label>
              <label className="space-y-1.5">
                <span className={LABEL}>Webhook avatar URL</span>
                <input
                  value={webhookAvatarUrl}
                  onChange={(e) => setWebhookAvatarUrl(e.target.value)}
                  className={INPUT}
                  placeholder="https://..."
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className={LABEL}>API Key (opcional)</span>
                <input
                  value={announceKey}
                  onChange={(e) => setAnnounceKey(e.target.value)}
                  className={INPUT}
                  placeholder="x-announce-key"
                />
              </label>
            </div>
          </Collapsible>

          {/* ───── Publish ───── */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={publish.loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#ffac00]/40 bg-[#ffac00]/20 px-4 py-2.5 text-sm font-medium text-[#ffac00] transition-all duration-200 hover:shadow-[0_0_18px_rgba(255,172,0,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {publish.loading ? "Publicando..." : "Publicar anuncio"}
            </button>
            {publish.error && (
              <p className="text-sm text-[var(--color-accent-red)]">
                {publish.error}
              </p>
            )}
            {publish.success && (
              <p className="text-sm text-[var(--color-accent-green)]">
                {publish.success}
              </p>
            )}
          </div>
        </form>
      </UICard>

      {/* ────────────────── PREVIEW PANEL ─────────────── */}
      <UICard className="xl:col-span-5 p-6">
        <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">
          Preview — Components v2
        </p>
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-4">
          {/* Webhook identity */}
          {(webhookUsername || webhookAvatarUrl) && (
            <div className="mb-3 flex items-center gap-2">
              {webhookAvatarUrl ? (
                <img
                  src={webhookAvatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-[#5865f2]" />
              )}
              <span className="text-sm font-semibold text-[#f2f3f5]">
                {webhookUsername || "Webhook"}
              </span>
              <span className="rounded bg-[#5865f2] px-1 py-0.5 text-[10px] font-medium text-white">
                BOT
              </span>
            </div>
          )}

          {/* Content above */}
          {contentAbove && (
            <p className="mb-3 text-sm text-[#dbdee1]">{contentAbove}</p>
          )}

          {/* Container */}
          <div
            className={`overflow-hidden rounded-lg ${spoiler ? "relative" : ""}`}
            style={{
              background: "#1e1f22",
              borderLeft: `3px solid ${accentColorHex || "#ffac00"}`,
            }}
          >
            {/* Spoiler overlay */}
            {spoiler && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[#1e1f22]/95 backdrop-blur-sm">
                <span className="rounded bg-[#4e5058] px-3 py-1 text-xs font-medium text-[#dbdee1]">
                  SPOILER
                </span>
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Title */}
              {title &&
                (thumbnailUrl ? (
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-[#f2f3f5]">
                      {title}
                    </h3>
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <h3 className="text-base font-bold text-[#f2f3f5]">
                    {title}
                  </h3>
                ))}

              {/* Description */}
              {description && (
                <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">
                  {description}
                </p>
              )}

              {/* Blocks */}
              {previewBlocks.length > 0 && (
                <>
                  {(title || description) &&
                    previewBlocks[0]?.type !== "separator" && (
                      <div className="border-t border-white/[0.06]" />
                    )}
                  {previewBlocks.map((block, index) =>
                    renderBlockPreview(block, index, previewBlocks)
                  )}
                </>
              )}

              {/* Footer */}
              {footerText && (
                <>
                  <div className="border-t border-white/[0.06]" />
                  <p className="text-[11px] text-[#949ba4]">{footerText}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </UICard>
    </div>
  );
}
