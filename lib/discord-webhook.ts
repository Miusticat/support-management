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

export type ComponentsV2Input = {
  accentColorHex?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
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

function buildComponentsV2(payload: ComponentsV2Input): DiscordComponent[] {
  const components: DiscordComponent[] = [];

  if (payload.contentAbove?.trim()) {
    components.push({ type: 10, content: payload.contentAbove });
  }

  const containerChildren: ContainerComponent["components"] = [];

  if (payload.title) {
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
    containerChildren.push({ type: 10, content: payload.description });
  }

  if (payload.fields && payload.fields.length > 0) {
    containerChildren.push({ type: 14, divider: true, spacing: 1 });

    const fieldsText = payload.fields
      .filter((f) => f.name.trim() && f.value.trim())
      .map((f) => `**${f.name}**\n${f.value}`)
      .join("\n\n");

    if (fieldsText) {
      containerChildren.push({ type: 10, content: fieldsText });
    }
  }

  if (payload.sections && payload.sections.length > 0) {
    for (const section of payload.sections) {
      if (!section.text.trim()) continue;

      containerChildren.push({ type: 14, divider: true, spacing: 1 });

      const sectionComponent: SectionComponent = {
        type: 9,
        components: [{ type: 10, content: section.text }],
        accessory: section.thumbnailUrl
          ? { type: 11, media: { url: section.thumbnailUrl } }
          : section.buttonUrl
            ? { type: 2, style: 5 as const, label: section.buttonLabel || "Abrir", url: section.buttonUrl }
            : { type: 2, style: 2 as const, label: section.buttonLabel || "Info", custom_id: "_noop", disabled: true },
      };
      containerChildren.push(sectionComponent);
    }
  }

  if (payload.imageUrl) {
    containerChildren.push({ type: 14, divider: false, spacing: 1 });
    containerChildren.push({
      type: 12,
      items: [{ media: { url: payload.imageUrl } }],
    });
  }

  if (payload.buttons && payload.buttons.length > 0) {
    containerChildren.push({ type: 14, divider: true, spacing: 1 });
    const buttonComponents: ButtonComponent[] = payload.buttons
      .slice(0, 5)
      .map((btn) => {
        if (btn.url) {
          return {
            type: 2 as const,
            style: 5 as const,
            label: btn.label,
            url: btn.url,
            emoji: btn.emoji ? { name: btn.emoji } : undefined,
          };
        }
        return {
          type: 2 as const,
          style: (btn.style || 2) as ButtonComponent["style"],
          label: btn.label,
          custom_id: `btn_${btn.label.toLowerCase().replace(/\s+/g, "_")}`,
          emoji: btn.emoji ? { name: btn.emoji } : undefined,
        };
      });
    containerChildren.push({ type: 1, components: buttonComponents });
  }

  if (payload.footerText) {
    containerChildren.push({ type: 14, divider: true, spacing: 1 });
    containerChildren.push({
      type: 10,
      content: `-# ${payload.footerText}`,
    });
  }

  if (containerChildren.length > 0) {
    components.push({
      type: 17,
      accent_color: hexToDecimalColor(payload.accentColorHex ?? "#ffac00"),
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
