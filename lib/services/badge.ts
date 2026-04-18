/**
 * Badge auto-award service.
 *
 * System-defined badges are seeded by this module (ensureSeedBadges) and
 * auto-checked after XP-award events. Each badge has a `criteria` JSON
 * that the engine evaluates against the user's stats.
 *
 * Criteria types supported:
 *   { type: "POST_COUNT", min: N }
 *   { type: "COMMENT_COUNT", min: N }
 *   { type: "CHECKIN_COUNT", min: N }
 *   { type: "XP_TOTAL", min: N }
 *   { type: "LEVEL", min: N }
 *   { type: "STREAK", min: N }
 *   { type: "FIRST_POST" }
 *   { type: "FIRST_CHECKIN" }
 *
 * Awards are idempotent — calling checkAndAward multiple times never
 * creates duplicates (@@unique([badgeId, userId]) on BadgeAward).
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { createNotification } from "./notification";

type Criteria =
  | { type: "POST_COUNT"; min: number }
  | { type: "COMMENT_COUNT"; min: number }
  | { type: "CHECKIN_COUNT"; min: number }
  | { type: "XP_TOTAL"; min: number }
  | { type: "LEVEL"; min: number }
  | { type: "STREAK"; min: number }
  | { type: "FIRST_POST" }
  | { type: "FIRST_CHECKIN" };

const SYSTEM_BADGES: {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  rarity: string;
  criteria: Criteria;
}[] = [
  {
    slug: "first-post",
    name: "Bài đầu tiên",
    emoji: "📝",
    description: "Đăng bài viết đầu tiên trên focus.camp",
    rarity: "COMMON",
    criteria: { type: "FIRST_POST" },
  },
  {
    slug: "first-checkin",
    name: "Check-in đầu tiên",
    emoji: "🔥",
    description: "Check-in challenge lần đầu",
    rarity: "COMMON",
    criteria: { type: "FIRST_CHECKIN" },
  },
  {
    slug: "streak-7",
    name: "7-Day Streak",
    emoji: "🔥",
    description: "Duy trì hoạt động 7 ngày liên tục",
    rarity: "UNCOMMON",
    criteria: { type: "STREAK", min: 7 },
  },
  {
    slug: "streak-30",
    name: "30-Day Streak",
    emoji: "🔥🔥",
    description: "Duy trì hoạt động 30 ngày liên tục — tập thành thói quen",
    rarity: "RARE",
    criteria: { type: "STREAK", min: 30 },
  },
  {
    slug: "streak-90",
    name: "90-Day Inferno",
    emoji: "🔥🔥🔥",
    description: "90 ngày liên tục — không ai ngăn nổi bạn",
    rarity: "LEGENDARY",
    criteria: { type: "STREAK", min: 90 },
  },
  {
    slug: "level-10",
    name: "Level 10",
    emoji: "⭐",
    description: "Đạt Level 10 trong một cộng đồng",
    rarity: "UNCOMMON",
    criteria: { type: "LEVEL", min: 10 },
  },
  {
    slug: "level-50",
    name: "Level 50",
    emoji: "🌟",
    description: "Đạt Level 50 — veteran thực sự",
    rarity: "RARE",
    criteria: { type: "LEVEL", min: 50 },
  },
  {
    slug: "posts-10",
    name: "10 bài viết",
    emoji: "✍️",
    description: "Đăng tổng 10 bài viết trên platform",
    rarity: "COMMON",
    criteria: { type: "POST_COUNT", min: 10 },
  },
  {
    slug: "posts-100",
    name: "100 bài viết",
    emoji: "📚",
    description: "100 bài — content machine",
    rarity: "RARE",
    criteria: { type: "POST_COUNT", min: 100 },
  },
  {
    slug: "checkins-50",
    name: "50 Check-ins",
    emoji: "⚔️",
    description: "50 lần check-in challenge — warrior chính hiệu",
    rarity: "UNCOMMON",
    criteria: { type: "CHECKIN_COUNT", min: 50 },
  },
];

/**
 * Ensure all system badges exist in the DB. Idempotent — safe to call
 * on every deploy or every server start. Uses upsert on slug.
 */
export async function ensureSeedBadges() {
  let created = 0;
  for (const b of SYSTEM_BADGES) {
    await prisma.badge.upsert({
      where: { id: b.slug }, // id won't match, so use a different approach
      update: {},
      create: {
        slug: b.slug,
        name: b.name,
        emoji: b.emoji,
        description: b.description,
        rarity: b.rarity,
        criteria: b.criteria as unknown as Prisma.JsonObject,
      },
    }).catch(() => {
      // Unique constraint on slug might not exist — just findFirst + create
    });
    const existing = await prisma.badge.findFirst({
      where: { slug: b.slug },
    });
    if (!existing) {
      await prisma.badge.create({
        data: {
          slug: b.slug,
          name: b.name,
          emoji: b.emoji,
          description: b.description,
          rarity: b.rarity,
          criteria: b.criteria as unknown as Prisma.JsonObject,
        },
      });
      created++;
    }
  }
  if (created > 0) {
    logger.info({ created }, "[badge] seeded system badges");
  }
}

/**
 * Check and award eligible badges for a user. Call after any XP award,
 * streak bump, post creation, or checkin event.
 *
 * Runs all system badges — skips already-awarded ones efficiently.
 */
export async function checkAndAwardBadges(input: {
  userId: string;
  communityId?: string;
}) {
  const badges = await prisma.badge.findMany({
    where: { communityId: null }, // system badges only
  });
  if (badges.length === 0) return;

  // Fetch user stats once
  const [postCount, commentCount, checkinCount, memberships, existingAwards] =
    await Promise.all([
      prisma.post.count({ where: { userId: input.userId } }),
      prisma.comment.count({ where: { userId: input.userId } }),
      prisma.checkin.count({ where: { userId: input.userId } }),
      prisma.membership.findMany({
        where: { userId: input.userId },
        select: { xp: true, level: true, streakDays: true },
      }),
      prisma.badgeAward.findMany({
        where: { userId: input.userId },
        select: { badgeId: true },
      }),
    ]);
  const awarded = new Set(existingAwards.map((a) => a.badgeId));
  const maxLevel = Math.max(0, ...memberships.map((m) => m.level));
  const maxStreak = Math.max(0, ...memberships.map((m) => m.streakDays));

  const toAward: typeof badges = [];
  for (const badge of badges) {
    if (awarded.has(badge.id)) continue;
    const c = badge.criteria as unknown as Criteria;
    let eligible = false;

    switch (c.type) {
      case "FIRST_POST":
        eligible = postCount >= 1;
        break;
      case "FIRST_CHECKIN":
        eligible = checkinCount >= 1;
        break;
      case "POST_COUNT":
        eligible = postCount >= c.min;
        break;
      case "COMMENT_COUNT":
        eligible = commentCount >= c.min;
        break;
      case "CHECKIN_COUNT":
        eligible = checkinCount >= c.min;
        break;
      case "LEVEL":
        eligible = maxLevel >= c.min;
        break;
      case "STREAK":
        eligible = maxStreak >= c.min;
        break;
      case "XP_TOTAL":
        eligible = memberships.some((m) => m.xp >= c.min);
        break;
    }

    if (eligible) {
      toAward.push(badge);
    }
  }

  if (toAward.length === 0) return;

  // Batch insert all awards at once
  try {
    await prisma.badgeAward.createMany({
      data: toAward.map((b) => ({ badgeId: b.id, userId: input.userId })),
      skipDuplicates: true,
    });
    for (const badge of toAward) {
      logger.info(
        { badge: badge.slug, userId: input.userId },
        "[badge] awarded"
      );
    }
    // Fire notifications in parallel
    await Promise.all(
      toAward.map((badge) =>
        createNotification({
          userId: input.userId,
          type: "POST_COT",
          title: `Bạn đạt badge: ${badge.emoji} ${badge.name}`,
          body: badge.description ?? undefined,
        }).catch((err) =>
          logger.warn({ err, badge: badge.slug }, "[badge] notification failed")
        )
      )
    );
  } catch (err) {
    logger.warn({ err }, "[badge] batch award failed");
  }
}
