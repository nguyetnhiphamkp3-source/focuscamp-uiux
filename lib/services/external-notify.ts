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

export type TemplateVars = Record<string, string>;

interface EventTemplate {
  title?: string;
  description?: string;
}

interface ChannelConfig {
  discord?: { webhookUrl: string; eventTypes: string[] };
  telegram?: { botToken: string; chatId: string; eventTypes: string[] };
  templates?: Record<string, EventTemplate>;
}

function parseConfig(raw: unknown): ChannelConfig {
  if (!raw || typeof raw !== "object") return {};
  return raw as ChannelConfig;
}

export interface DispatchPayload {
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  fields?: Array<{ name: string; value: string }>;
}

/** Replace {{key}} placeholders in a template string with vars values. */
function sub(tmpl: string, vars: TemplateVars): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

/** Merge custom template (if any) into the payload using provided vars. */
function applyTemplateOverride(
  payload: DispatchPayload,
  tmpl: EventTemplate | undefined,
  vars: TemplateVars | undefined
): DispatchPayload {
  if (!tmpl || !vars) return payload;
  return {
    ...payload,
    title: tmpl.title ? sub(tmpl.title, vars) : payload.title,
    description: tmpl.description !== undefined ? sub(tmpl.description, vars) : payload.description,
  };
}

export async function dispatchToChannels(
  communityId: string,
  eventType: ExternalEventType,
  payload: DispatchPayload,
  vars?: TemplateVars
) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, channelConfig: true },
  });
  if (!community) return;
  const cfg = parseConfig(community.channelConfig);

  const tmpl = cfg.templates?.[eventType];
  const p = applyTemplateOverride(payload, tmpl, vars);

  const tasks: Array<Promise<unknown>> = [];

  if (
    cfg.discord?.webhookUrl &&
    cfg.discord.eventTypes?.includes(eventType)
  ) {
    tasks.push(
      sendDiscordEmbed(cfg.discord.webhookUrl, {
        title: p.title,
        description: p.description,
        url: p.url,
        thumbnail: p.thumbnail,
        fields: p.fields,
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
        `*${p.title}*`,
        p.description ?? "",
        p.url ? `\n${p.url}` : "",
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
