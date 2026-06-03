/**
 * Community concept settings — owner/admin mutations of the JSON config
 * fields on Community (pillarsConfig, classesConfig, gemsConfig,
 * levelsConfig). These are the dynamic "taxonomy" each community defines.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import {
  effectiveCommunityRole,
  canCommunity,
  type CommunityPermission,
} from "@/lib/community-permissions";
import type {
  PillarConfig,
  ClassConfig,
  GemsConfig,
  LevelTier,
  FeatureKey,
} from "@/lib/community-config";

export async function assertCommunityPermission(
  userId: string,
  communityId: string,
  permission: CommunityPermission,
): Promise<void> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!community) throw new Error("Cộng đồng không tồn tại");
  const isOwner = community.ownerId === userId;
  let membershipRole: string | null = null;
  if (!isOwner) {
    const m = await prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { role: true },
    });
    membershipRole = m?.role ?? null;
  }
  const role = effectiveCommunityRole({ isOwner, membershipRole });
  if (!canCommunity(role, permission)) {
    throw new Error("Bạn không có quyền thực hiện hành động này");
  }
}

/** Reject duplicate `key` within the same list. */
function assertUniqueKeys<T extends { key: string }>(items: T[], what: string) {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.key)) throw new Error(`Key trùng trong ${what}: "${it.key}"`);
    seen.add(it.key);
  }
}

export async function updatePillarsConfig(input: {
  userId: string;
  communityId: string;
  pillars: PillarConfig[];
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_settings");
  assertUniqueKeys(input.pillars, "Pillars");

  const cleaned = input.pillars.map((p) => ({
    key: p.key,
    label: p.label,
    ...(p.emoji ? { emoji: p.emoji } : {}),
    ...(p.cssClass ? { cssClass: p.cssClass } : {}),
    ...(p.color ? { color: p.color } : {}),
  }));

  await prisma.community.update({
    where: { id: input.communityId },
    data: { pillarsConfig: cleaned },
  });
  logger.info(
    { communityId: input.communityId, count: cleaned.length, userId: input.userId },
    "[community-settings] pillars updated"
  );
}

export async function updateClassesConfig(input: {
  userId: string;
  communityId: string;
  classes: ClassConfig[];
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_settings");
  assertUniqueKeys(input.classes, "Classes");

  const cleaned = input.classes.map((c) => ({
    key: c.key,
    label: c.label,
    ...(c.emoji ? { emoji: c.emoji } : {}),
    ...(c.description ? { description: c.description } : {}),
    ...(c.color ? { color: c.color } : {}),
  }));

  await prisma.community.update({
    where: { id: input.communityId },
    data: { classesConfig: cleaned },
  });
  logger.info(
    { communityId: input.communityId, count: cleaned.length, userId: input.userId },
    "[community-settings] classes updated"
  );
}

export async function updateCurrencyConfig(input: {
  userId: string;
  communityId: string;
  currency: GemsConfig;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_settings");

  const cleaned = {
    currencyName: input.currency.currencyName,
    currencyIcon: input.currency.currencyIcon,
    ...(input.currency.gemsName ? { gemsName: input.currency.gemsName } : {}),
    ...(input.currency.gemsIcon ? { gemsIcon: input.currency.gemsIcon } : {}),
  };

  await prisma.community.update({
    where: { id: input.communityId },
    data: { gemsConfig: cleaned },
  });
  logger.info(
    { communityId: input.communityId, userId: input.userId },
    "[community-settings] currency updated"
  );
}

/**
 * List members of a community with their User row joined. Owner + admin-only
 * at the page/action level; service itself trusts the caller (no gate here
 * so the profile page etc. can use it too if needed).
 */
export async function listMembers(input: {
  communityId: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { communityId, search, limit = 50, offset = 0 } = input;
  const [members, total] = await Promise.all([
    prisma.membership.findMany({
      where: {
        communityId,
        ...(search
          ? {
              OR: [
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } },
                { user: { handle: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            handle: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.membership.count({ where: { communityId } }),
  ]);
  return { members, total };
}

const ALLOWED_ROLES = new Set(["MEMBER", "MOD", "ADMIN"]);

export async function updateMemberRole(input: {
  userId: string;
  communityId: string;
  targetUserId: string;
  role: string;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_roles");
  if (!ALLOWED_ROLES.has(input.role)) {
    throw new Error(`Role không hợp lệ: ${input.role}`);
  }
  // Owner's own role is meaningless — owner status is on Community.ownerId.
  // Don't allow them to change their own membership row's role via this path.
  if (input.targetUserId === input.userId) {
    throw new Error("Không thể đổi role của chính mình");
  }
  await prisma.membership.update({
    where: {
      userId_communityId: {
        userId: input.targetUserId,
        communityId: input.communityId,
      },
    },
    data: { role: input.role },
  });
  logger.info(
    {
      communityId: input.communityId,
      target: input.targetUserId,
      role: input.role,
      by: input.userId,
    },
    "[community-settings] member role updated"
  );
}

export async function removeMember(input: {
  userId: string;
  communityId: string;
  targetUserId: string;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_roles");
  if (input.targetUserId === input.userId) {
    throw new Error("Không thể tự xoá mình. Chuyển owner trước.");
  }
  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { ownerId: true },
  });
  if (community?.ownerId === input.targetUserId) {
    throw new Error("Không thể xoá chủ cộng đồng");
  }
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.membership.deleteMany({
      where: {
        userId: input.targetUserId,
        communityId: input.communityId,
      },
    });
    if (deleted.count > 0) {
      await tx.community.update({
        where: { id: input.communityId },
        data: { memberCount: { decrement: deleted.count } },
      });
    }
  });
  logger.info(
    {
      communityId: input.communityId,
      target: input.targetUserId,
      by: input.userId,
    },
    "[community-settings] member removed"
  );
}

export async function updateLevelsConfig(input: {
  userId: string;
  communityId: string;
  tiers: LevelTier[];
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_settings");

  // Sort ascending and ensure no duplicate minLevel
  const sorted = input.tiers.slice().sort((a, b) => a.minLevel - b.minLevel);
  const seen = new Set<number>();
  for (const t of sorted) {
    if (seen.has(t.minLevel))
      throw new Error(`Level trùng: ${t.minLevel}`);
    seen.add(t.minLevel);
  }

  const cleaned = sorted.map((t) => ({
    minLevel: t.minLevel,
    name: t.name,
    ...(t.emoji ? { emoji: t.emoji } : {}),
    ...(t.color ? { color: t.color } : {}),
  }));

  await prisma.community.update({
    where: { id: input.communityId },
    data: { levelsConfig: cleaned },
  });
  logger.info(
    { communityId: input.communityId, count: cleaned.length, userId: input.userId },
    "[community-settings] levels updated"
  );
}

export async function updateChannelConfig(input: {
  userId: string;
  communityId: string;
  discord: Array<{ webhookUrl: string; eventTypes: string[]; challengeIds?: string[] }> | null;
  telegram: Array<{
    id?: string;
    botToken?: string;
    chatId: string;
    topicId?: string;
    eventTypes: string[];
    challengeIds?: string[];
  }> | null;
  templates?: Record<string, { title?: string; description?: string }>;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_api_keys");
  const { encryptSecret } = await import("@/lib/integrations/encryption");
  const { randomUUID } = await import("crypto");
  const { normalizeChannelConfig } = await import("@/lib/channel-config");

  // Load existing telegram channels so we can preserve encrypted bot tokens
  // for channels the client did not re-enter (token is never sent to client).
  const existing = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { channelConfig: true },
  });
  const prev = normalizeChannelConfig(existing?.channelConfig);
  const tokenById = new Map(prev.telegram.map((t) => [t.id, t.botToken]));
  const tokenByChat = new Map(prev.telegram.map((t) => [t.chatId, t.botToken]));
  // Preserve the original "added by" snapshot so re-saving the whole config
  // doesn't reassign authorship of channels someone else added.
  const addedByTgId = new Map(prev.telegram.flatMap((t) => (t.addedBy ? [[t.id, t.addedBy] as const] : [])));
  const addedByTgChat = new Map(prev.telegram.flatMap((t) => (t.addedBy ? [[t.chatId, t.addedBy] as const] : [])));
  const addedByDiscordUrl = new Map(
    prev.discord.flatMap((d) => (d.addedBy ? [[d.webhookUrl, d.addedBy] as const] : [])),
  );
  const actor = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });
  const addedByNow = { id: input.userId, name: actor?.name ?? "" };

  const optionalIds = (ids?: string[]) =>
    ids && ids.length ? { challengeIds: ids } : {};

  const config: Record<string, unknown> = {};

  const discord = (input.discord ?? [])
    .filter((d) => d.webhookUrl.trim())
    .map((d) => {
      const url = d.webhookUrl.trim();
      return {
        webhookUrl: url,
        eventTypes: d.eventTypes,
        ...optionalIds(d.challengeIds),
        addedBy: addedByDiscordUrl.get(url) ?? addedByNow,
      };
    });
  if (discord.length) config.discord = discord;

  const telegram: Array<Record<string, unknown>> = [];
  for (const t of input.telegram ?? []) {
    const chatId = t.chatId.trim();
    if (!chatId) continue;
    // Resolve the encrypted token: re-entered > preserved by id > preserved by chatId.
    const entered = t.botToken?.trim();
    let stored = "";
    if (entered) stored = encryptSecret(entered);
    else if (t.id && tokenById.has(t.id)) stored = tokenById.get(t.id) ?? "";
    else if (tokenByChat.has(chatId)) stored = tokenByChat.get(chatId) ?? "";
    if (!stored) continue; // no token available for this channel — drop it
    const addedBy =
      (t.id && addedByTgId.get(t.id)) || addedByTgChat.get(chatId) || addedByNow;
    telegram.push({
      id: t.id || randomUUID(),
      botToken: stored,
      chatId,
      eventTypes: t.eventTypes,
      ...(t.topicId?.trim() ? { topicId: t.topicId.trim() } : {}),
      ...optionalIds(t.challengeIds),
      addedBy,
    });
  }
  if (telegram.length) config.telegram = telegram;

  // Strip empty strings so config stays clean
  if (input.templates && Object.keys(input.templates).length > 0) {
    const cleaned: Record<string, { title?: string; description?: string }> = {};
    for (const [k, v] of Object.entries(input.templates)) {
      const t = v.title?.trim();
      const d = v.description?.trim();
      if (t || d !== undefined) cleaned[k] = { ...(t ? { title: t } : {}), ...(d !== undefined ? { description: d } : {}) };
    }
    if (Object.keys(cleaned).length > 0) config.templates = cleaned;
  }

  await prisma.community.update({
    where: { id: input.communityId },
    data: {
      channelConfig: Object.keys(config).length ? (config as object) : Prisma.JsonNull,
    },
  });
  logger.info(
    {
      communityId: input.communityId,
      discordCount: discord.length,
      telegramCount: telegram.length,
    },
    "[community-settings] channel config updated"
  );
}

export async function updateUiConfig(input: {
  userId: string;
  communityId: string;
  hiddenFeatures: FeatureKey[];
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_settings");
  // Dedupe + normalise (preserve input ordering)
  const seen = new Set<FeatureKey>();
  const hidden = input.hiddenFeatures.filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await prisma.community.update({
    where: { id: input.communityId },
    data: { uiConfig: { hiddenFeatures: hidden } },
  });
  logger.info(
    { communityId: input.communityId, hidden, userId: input.userId },
    "[community-settings] ui config updated"
  );
}
