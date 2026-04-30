/**
 * Dispatch focus.camp events to external channels (Discord webhook + Telegram bot).
 * Reads Community.channelConfig + per-event whitelist + sends in parallel.
 * Best-effort: failures logged, never block the originating flow.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendDiscordEmbed } from "@/lib/integrations/discord";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { decryptSecret } from "@/lib/integrations/encryption";

export type ExternalEventType =
  | "new_member"
  | "checkin_submitted"
  | "post_cot"
  | "purchase_completed"
  | "challenge_completed";

interface ChannelConfig {
  discord?: { webhookUrl: string; eventTypes: string[] };
  telegram?: { botToken: string; chatId: string; eventTypes: string[] };
}

function parseConfig(raw: unknown): ChannelConfig {
  if (!raw || typeof raw !== "object") return {};
  return raw as ChannelConfig;
}

export interface DispatchPayload {
  title: string;
  description?: string;
  url?: string;
  fields?: Array<{ name: string; value: string }>;
}

export async function dispatchToChannels(
  communityId: string,
  eventType: ExternalEventType,
  payload: DispatchPayload
) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, channelConfig: true },
  });
  if (!community) return;
  const cfg = parseConfig(community.channelConfig);

  const tasks: Array<Promise<unknown>> = [];

  if (
    cfg.discord?.webhookUrl &&
    cfg.discord.eventTypes?.includes(eventType)
  ) {
    tasks.push(
      sendDiscordEmbed(cfg.discord.webhookUrl, {
        title: payload.title,
        description: payload.description,
        url: payload.url,
        fields: payload.fields,
      }).catch(() => false)
    );
  }

  if (
    cfg.telegram?.botToken &&
    cfg.telegram.chatId &&
    cfg.telegram.eventTypes?.includes(eventType)
  ) {
    const token = decryptSecret(cfg.telegram.botToken);
    if (token) {
      const text = [
        `*${payload.title}*`,
        payload.description ?? "",
        payload.url ? `\n${payload.url}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      tasks.push(
        sendTelegramMessage(token, cfg.telegram.chatId, {
          text,
        }).catch(() => false)
      );
    }
  }

  if (tasks.length === 0) return;
  // fire-and-await all but never throw
  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    logger.warn(
      { communityId, eventType, failed, total: tasks.length },
      "[external-notify] some deliveries failed"
    );
  }
}
