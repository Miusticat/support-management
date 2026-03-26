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

function hexToDecimalColor(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 0x8c73f8;
  }

  return parseInt(normalized, 16);
}

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
