/**
 * Community concept settings — owner-only mutations of the JSON config
 * fields on Community (pillarsConfig, classesConfig, gemsConfig,
 * levelsConfig). These are the dynamic "taxonomy" each community defines.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type {
  PillarConfig,
  ClassConfig,
  GemsConfig,
  LevelTier,
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
