/**
 * Shared types + normalizer for Community.channelConfig.
 *
 * Supports MULTIPLE Discord webhooks and MULTIPLE Telegram bots/groups per
 * community, each with its own event whitelist and optional per-challenge
 * filter. Legacy single-object configs (one discord / one telegram) are
 * normalized into 1-element arrays so old data keeps working.
 *
 * Server-only (uses crypto for stable Telegram channel ids — needed to
 * preserve encrypted bot tokens across saves). Do NOT import from client code.
 */
import { randomUUID } from "crypto";

/** Challenge-scoped events that honor a channel's `challengeIds` filter. */
export const CHALLENGE_SCOPED_EVENTS = ["checkin_submitted", "challenge_completed"] as const;

/** Snapshot of the user who added a channel (for an audit label). */
export interface ChannelAddedBy {
  id: string;
  name: string;
}

export interface DiscordChannel {
  webhookUrl: string;
  eventTypes: string[];
  /** Empty/undefined = all challenges. Only applies to challenge-scoped events. */
  challengeIds?: string[];
  /** Who added this webhook (server-set; absent for legacy entries). */
  addedBy?: ChannelAddedBy;
}

export interface TelegramChannel {
  /** Stable id — used to preserve the encrypted bot token across saves. */
  id: string;
  /** Encrypted at rest (see lib/integrations/encryption). */
  botToken: string;
  chatId: string;
  /** Telegram forum topic thread (message_thread_id). */
  topicId?: string;
  eventTypes: string[];
  /** Empty/undefined = all challenges. Only applies to challenge-scoped events. */
  challengeIds?: string[];
  /** Who added this bot (server-set; absent for legacy entries). */
  addedBy?: ChannelAddedBy;
}

export interface EventTemplate {
  title?: string;
  description?: string;
}

export interface NormalizedChannelConfig {
  discord: DiscordChannel[];
  telegram: TelegramChannel[];
  templates?: Record<string, EventTemplate>;
}

/** Wrap a legacy single object into an array; pass arrays through. */
function asArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object");
  if (v && typeof v === "object") return [v as Record<string, unknown>];
  return [];
}

function cleanIds(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const ids = v.filter((x): x is string => typeof x === "string" && x.length > 0);
  return ids.length ? ids : undefined;
}

function cleanAddedBy(v: unknown): ChannelAddedBy | undefined {
  if (!v || typeof v !== "object") return undefined;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return undefined;
  return { id: r.id, name: typeof r.name === "string" ? r.name : "" };
}

export function normalizeChannelConfig(raw: unknown): NormalizedChannelConfig {
  if (!raw || typeof raw !== "object") return { discord: [], telegram: [] };
  const r = raw as Record<string, unknown>;

  const discord: DiscordChannel[] = asArray(r.discord)
    .filter((d) => typeof d.webhookUrl === "string" && d.webhookUrl)
    .map((d) => ({
      webhookUrl: d.webhookUrl as string,
      eventTypes: Array.isArray(d.eventTypes) ? (d.eventTypes as string[]) : [],
      challengeIds: cleanIds(d.challengeIds),
      addedBy: cleanAddedBy(d.addedBy),
    }));

  const telegram: TelegramChannel[] = asArray(r.telegram)
    .filter((t) => typeof t.chatId === "string" && t.chatId)
    .map((t) => ({
      id: typeof t.id === "string" && t.id ? t.id : randomUUID(),
      botToken: typeof t.botToken === "string" ? t.botToken : "",
      chatId: t.chatId as string,
      topicId: typeof t.topicId === "string" && t.topicId ? t.topicId : undefined,
      eventTypes: Array.isArray(t.eventTypes) ? (t.eventTypes as string[]) : [],
      challengeIds: cleanIds(t.challengeIds),
      addedBy: cleanAddedBy(t.addedBy),
    }));

  const templates =
    r.templates && typeof r.templates === "object"
      ? (r.templates as Record<string, EventTemplate>)
      : undefined;

  return { discord, telegram, templates };
}

/**
 * Whether a channel should receive a given event, honoring its challenge
 * filter for challenge-scoped events only.
 */
export function channelReceives(
  channel: { eventTypes: string[]; challengeIds?: string[] },
  eventType: string,
  challengeId?: string,
): boolean {
  if (!channel.eventTypes.includes(eventType)) return false;
  const scoped = (CHALLENGE_SCOPED_EVENTS as readonly string[]).includes(eventType);
  if (scoped && channel.challengeIds && channel.challengeIds.length > 0) {
    return !!challengeId && channel.challengeIds.includes(challengeId);
  }
  return true;
}
