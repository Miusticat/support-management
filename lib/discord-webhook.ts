type EmbedFieldInput = {
  name: string;
  value: string;
  inline?: boolean;
};

type AnnouncementInput = {
  title: string;
  description: string;
  colorHex?: string;
  url?: string;
  authorName?: string;
  authorIconUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  fields?: EmbedFieldInput[];
  content?: string;
  mentionUserIds?: string[];
};

// --- Components v2 types ---

type DiscordComponent =
  | TextDisplayComponent
  | SectionComponent
  | SeparatorComponent
  | MediaGalleryComponent
  | ContainerComponent
  | ActionRowComponent;

type TextDisplayComponent = {
  type: 10;
  content: string;
};

type ThumbnailComponent = {
  type: 11;
  media: { url: string };
  description?: string;
};

type ButtonComponent = {
  type: 2;
  style: 1 | 2 | 3 | 4 | 5;
  label?: string;
  url?: string;
  custom_id?: string;
  emoji?: { name: string };
  disabled?: boolean;
};

type SectionComponent = {
  type: 9;
  components: TextDisplayComponent[];
  accessory: ThumbnailComponent | ButtonComponent;
};

type SeparatorComponent = {
  type: 14;
  divider?: boolean;
  spacing?: 1 | 2;
};

type MediaGalleryComponent = {
  type: 12;
  items: Array<{
    media: { url: string };
    description?: string;
  }>;
};

type ActionRowComponent = {
  type: 1;
  components: ButtonComponent[];
};

type ContainerComponent = {
  type: 17;
  accent_color?: number;
  spoiler?: boolean;
  components: Array<
    | TextDisplayComponent
    | SectionComponent
    | SeparatorComponent
    | MediaGalleryComponent
    | ActionRowComponent
  >;
};

export type ComponentBlock =
  | { type: 'text'; content: string }
  | { type: 'fields'; fields: Array<{ name: string; value: string; inline?: boolean }> }
  | { type: 'section'; text: string; accessoryType: 'thumbnail' | 'button'; thumbnailUrl?: string; buttonLabel?: string; buttonUrl?: string; buttonEmoji?: string }
  | { type: 'separator'; divider: boolean; spacing: 1 | 2 }
  | { type: 'media-gallery'; items: Array<{ url: string; description?: string }> }
  | { type: 'action-row'; buttons: Array<{ label: string; url: string; emoji?: string }> };

export type ComponentsV2Input = {
  accentColorHex?: string;
  spoiler?: boolean;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  blocks?: ComponentBlock[];
  fields?: EmbedFieldInput[];
  buttons?: Array<{
    label: string;
    url?: string;
    style?: 1 | 2 | 3 | 4 | 5;
    emoji?: string;
  }>;
  sections?: Array<{
    text: string;
    thumbnailUrl?: string;
    buttonLabel?: string;
    buttonUrl?: string;
  }>;
  contentAbove?: string;
  webhookUsername?: string;
  webhookAvatarUrl?: string;
  mentionUserIds?: string[];
};

const IS_COMPONENTS_V2 = 1 << 15;

function hexToDecimalColor(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 0x8c73f8;
  }

  return parseInt(normalized, 16);
}

type ContainerChild = ContainerComponent["components"][number];

function buildBlockComponents(block: ComponentBlock): ContainerChild[] {
  switch (block.type) {
    case 'text':
      if (!block.content.trim()) return [];
      return [{ type: 10, content: block.content }];

    case 'fields': {
      const fieldsText = block.fields
        .filter((f) => f.name.trim() && f.value.trim())
        .map((f) => `**${f.name}**\n${f.value}`)
        .join("\n\n");
      if (!fieldsText) return [];
      return [{ type: 10, content: fieldsText }];
    }

    case 'section': {
      if (!block.text.trim()) return [];
      const accessory: SectionComponent["accessory"] =
        block.accessoryType === 'thumbnail' && block.thumbnailUrl
          ? { type: 11, media: { url: block.thumbnailUrl } }
          : block.accessoryType === 'button' && block.buttonUrl
            ? {
                type: 2, style: 5 as const,
                label: block.buttonLabel || "Abrir",
                url: block.buttonUrl,
                emoji: block.buttonEmoji ? { name: block.buttonEmoji } : undefined,
              }
            : { type: 2, style: 2 as const, label: block.buttonLabel || "Info", custom_id: "_noop", disabled: true };
      return [{ type: 9, components: [{ type: 10, content: block.text }], accessory } as SectionComponent];
    }

    case 'separator':
      return [{ type: 14, divider: block.divider, spacing: block.spacing }];

    case 'media-gallery': {
      const items = block.items.filter((i) => i.url.trim());
      if (items.length === 0) return [];
      return [{
        type: 12,
        items: items.map((i) => ({
          media: { url: i.url },
          description: i.description || undefined,
        })),
      }];
    }

    case 'action-row': {
      const buttons = block.buttons.filter((b) => b.label.trim() && b.url.trim()).slice(0, 5);
      if (buttons.length === 0) return [];
      return [{
        type: 1,
        components: buttons.map((btn) => ({
          type: 2 as const,
          style: 5 as const,
          label: btn.label,
          url: btn.url,
          emoji: btn.emoji ? { name: btn.emoji } : undefined,
        })),
      }];
    }

    default:
      return [];
  }
}

function buildComponentsV2(payload: ComponentsV2Input): DiscordComponent[] {
  const components: DiscordComponent[] = [];

  if (payload.contentAbove?.trim()) {
    components.push({ type: 10, content: payload.contentAbove });
  }

  const containerChildren: ContainerComponent["components"] = [];

  // Header
  let hasHeader = false;
  if (payload.title) {
    hasHeader = true;
    const titleMd = `## ${payload.title}`;
    if (payload.thumbnailUrl) {
      containerChildren.push({
        type: 9,
        components: [{ type: 10, content: titleMd }],
        accessory: { type: 11, media: { url: payload.thumbnailUrl } },
      });
    } else {
      containerChildren.push({ type: 10, content: titleMd });
    }
  }

  if (payload.description) {
    hasHeader = true;
    containerChildren.push({ type: 10, content: payload.description });
  }

  // Resolve blocks: use explicit blocks or convert legacy fields
  let blocks: ComponentBlock[] = [];

  if (payload.blocks && payload.blocks.length > 0) {
    blocks = payload.blocks;
  } else {
    if (payload.fields && payload.fields.length > 0) {
      blocks.push({ type: 'fields', fields: payload.fields });
    }
    if (payload.sections && payload.sections.length > 0) {
      for (const section of payload.sections) {
        if (!section.text.trim()) continue;
        blocks.push({
          type: 'section',
          text: section.text,
          accessoryType: section.thumbnailUrl ? 'thumbnail' : 'button',
          thumbnailUrl: section.thumbnailUrl,
          buttonLabel: section.buttonLabel,
          buttonUrl: section.buttonUrl,
        });
      }
    }
    if (payload.imageUrl) {
      blocks.push({ type: 'media-gallery', items: [{ url: payload.imageUrl }] });
    }
    if (payload.buttons && payload.buttons.length > 0) {
      blocks.push({
        type: 'action-row',
        buttons: payload.buttons
          .filter((b) => b.label && b.url)
          .map((b) => ({ label: b.label, url: b.url!, emoji: b.emoji })),
      });
    }
  }

  // Render blocks with auto-separators
  if (blocks.length > 0) {
    if (hasHeader && blocks[0].type !== 'separator') {
      containerChildren.push({ type: 14, divider: true, spacing: 1 });
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const prev = i > 0 ? blocks[i - 1] : null;
      if (i > 0 && block.type !== 'separator' && prev?.type !== 'separator') {
        containerChildren.push({ type: 14, divider: true, spacing: 1 });
      }
      containerChildren.push(...buildBlockComponents(block));
    }
  }

  // Footer
  if (payload.footerText) {
    const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
    if (containerChildren.length > 0 && (!lastBlock || lastBlock.type !== 'separator')) {
      containerChildren.push({ type: 14, divider: true, spacing: 1 });
    }
    containerChildren.push({ type: 10, content: `-# ${payload.footerText}` });
  }

  if (containerChildren.length > 0) {
    components.push({
      type: 17,
      accent_color: hexToDecimalColor(payload.accentColorHex ?? "#ffac00"),
      spoiler: payload.spoiler || undefined,
      components: containerChildren,
    });
  }

  return components;
}

export async function sendDiscordComponentsV2Webhook(
  webhookUrl: string,
  payload: ComponentsV2Input
) {
  const components = buildComponentsV2(payload);
  const separator = webhookUrl.includes("?") ? "&" : "?";
  const urlWithParams = `${webhookUrl}${separator}with_components=true&wait=true`;

  const body: Record<string, unknown> = {
    flags: IS_COMPONENTS_V2,
    components,
    ...(payload.webhookUsername ? { username: payload.webhookUsername } : {}),
    ...(payload.webhookAvatarUrl ? { avatar_url: payload.webhookAvatarUrl } : {}),
  };

  if (payload.mentionUserIds && payload.mentionUserIds.length > 0) {
    body.allowed_mentions = {
      users: payload.mentionUserIds,
    };
  }

  const response = await fetch(urlWithParams, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
  }
}

// Legacy embed-based webhook (used by sanctions)
export async function sendDiscordAnnouncementWebhook(
  webhookUrl: string,
  payload: AnnouncementInput
) {
  const embed = {
    title: payload.title,
    description: payload.description,
    url: payload.url,
    color: hexToDecimalColor(payload.colorHex ?? "#8C73F8"),
    timestamp: new Date().toISOString(),
    author: payload.authorName
      ? {
          name: payload.authorName,
          icon_url: payload.authorIconUrl,
        }
      : undefined,
    thumbnail: payload.thumbnailUrl
      ? {
          url: payload.thumbnailUrl,
        }
      : undefined,
    image: payload.imageUrl
      ? {
          url: payload.imageUrl,
        }
      : undefined,
    footer: payload.footerText
      ? {
          text: payload.footerText,
          icon_url: payload.footerIconUrl,
        }
      : undefined,
    fields: payload.fields?.map((field) => ({
      name: field.name,
      value: field.value,
      inline: field.inline ?? false,
    })),
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: payload.content,
      embeds: [embed],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
  }
}
