/**
 * Community concept settings — owner-only mutations of the JSON config
 * fields on Community (pillarsConfig, classesConfig, gemsConfig,
 * levelsConfig). These are the dynamic "taxonomy" each community defines.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import type {
  PillarConfig,
  ClassConfig,
  GemsConfig,
  LevelTier,
  FeatureKey,
} from "@/lib/community-config";

async function assertOwner(userId: string, communityId: string): Promise<void> {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== userId)
    throw new Error("Chỉ chủ cộng đồng mới sửa được cài đặt");
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
  await assertOwner(input.userId, input.communityId);
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
  await assertOwner(input.userId, input.communityId);
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
  await assertOwner(input.userId, input.communityId);

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
  await assertOwner(input.userId, input.communityId);
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
  await assertOwner(input.userId, input.communityId);
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
  await assertOwner(input.userId, input.communityId);

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
  discord: { webhookUrl: string; eventTypes: string[] } | null;
  telegram: { botToken: string; chatId: string; eventTypes: string[] } | null;
}) {
  await assertOwner(input.userId, input.communityId);
  const { encryptSecret } = await import("@/lib/integrations/encryption");

  const config: Record<string, unknown> = {};
  if (input.discord && input.discord.webhookUrl.trim()) {
    config.discord = {
      webhookUrl: input.discord.webhookUrl.trim(),
      eventTypes: input.discord.eventTypes,
    };
  }
  if (
    input.telegram &&
    input.telegram.botToken.trim() &&
    input.telegram.chatId.trim()
  ) {
    config.telegram = {
      botToken: encryptSecret(input.telegram.botToken.trim()),
      chatId: input.telegram.chatId.trim(),
      eventTypes: input.telegram.eventTypes,
    };
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
      hasDiscord: !!config.discord,
      hasTelegram: !!config.telegram,
    },
    "[community-settings] channel config updated"
  );
}

export async function updateUiConfig(input: {
  userId: string;
  communityId: string;
  hiddenFeatures: FeatureKey[];
}) {
  await assertOwner(input.userId, input.communityId);
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
