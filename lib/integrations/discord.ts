/**
 * Discord webhook delivery — fire-and-forget POST to a channel webhook URL.
 */
import { logger } from "@/lib/logger";

const BRAND_GREEN_HEX = 0x1b9e75;

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  thumbnail?: string;
}

export async function sendDiscordEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
  options?: { username?: string }
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: options?.username || "focus.camp",
        embeds: [
          {
            title: embed.title.slice(0, 256),
            description: embed.description?.slice(0, 4000),
            url: embed.url,
            color: embed.color ?? BRAND_GREEN_HEX,
            fields: embed.fields?.slice(0, 25),
            thumbnail: embed.thumbnail
              ? { url: embed.thumbnail }
              : undefined,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, body: await res.text().catch(() => "") },
        "[discord] webhook non-200"
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, "[discord] webhook fetch failed");
    return false;
  }
}
