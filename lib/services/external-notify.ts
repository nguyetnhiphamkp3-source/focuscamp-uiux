/**
 * Dispatch focus.camp events to external channels (Discord webhooks + Telegram bots).
 * Reads Community.channelConfig (multiple channels per platform, each with its own
 * event whitelist + optional per-challenge filter) and sends in parallel.
 * Best-effort: failures logged, never block the originating flow.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendDiscordEmbed } from "@/lib/integrations/discord";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { decryptSecret } from "@/lib/integrations/encryption";
import {
  normalizeChannelConfig,
  channelReceives,
  type EventTemplate,
} from "@/lib/channel-config";

export type ExternalEventType =
  | "new_member"
  | "checkin_submitted"
  | "post_cot"
  | "purchase_completed"
  | "challenge_completed";

export type TemplateVars = Record<string, string>;

export interface DispatchPayload {
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  fields?: Array<{ name: string; value: string }>;
}

/** Optional event scope — e.g. the originating challenge, used for per-challenge routing. */
export interface DispatchScope {
  challengeId?: string;
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
  vars?: TemplateVars,
  scope?: DispatchScope
) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, channelConfig: true },
  });
  if (!community) return;
  const cfg = normalizeChannelConfig(community.channelConfig);

  const tmpl = cfg.templates?.[eventType];
  const p = applyTemplateOverride(payload, tmpl, vars);

  const tasks: Array<Promise<unknown>> = [];

  for (const d of cfg.discord) {
    if (!channelReceives(d, eventType, scope?.challengeId)) continue;
    tasks.push(
      sendDiscordEmbed(d.webhookUrl, {
        title: p.title,
        description: p.description,
        url: p.url,
        thumbnail: p.thumbnail,
        fields: p.fields,
      }).catch(() => false)
    );
  }

  // Telegram message body is identical across channels — build once.
  const tgText = [`*${p.title}*`, p.description ?? "", p.url ? `\n${p.url}` : ""]
    .filter(Boolean)
    .join("\n");

  for (const t of cfg.telegram) {
    if (!t.botToken || !channelReceives(t, eventType, scope?.challengeId)) continue;
    const token = decryptSecret(t.botToken);
    if (!token) continue;
    const threadId = t.topicId ? Number(t.topicId) : undefined;
    tasks.push(
      sendTelegramMessage(token, t.chatId, {
        text: tgText,
        ...(threadId && Number.isFinite(threadId) ? { messageThreadId: threadId } : {}),
      }).catch(() => false)
    );
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
