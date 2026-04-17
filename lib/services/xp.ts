/**
 * XP award system.
 *
 * Per-community (Membership.xp/level), driven by actions:
 *   post      +5 XP
 *   comment   +2 XP
 *   checkin   +5 XP × streak multiplier
 *   best-answer awarded (to comment author) +10 XP
 *   submission approved (to submitter) +10 XP
 *
 * Streak multiplier (TAIP spec):
 *   streakDays ≥ 7  → 1.1x
 *   streakDays ≥ 30 → 1.2x
 *   streakDays ≥ 90 → 1.5x
 *
 * Level formula: level = floor(xp / 100) + 1 (starts at 1 with 0 XP).
 * Each action also persists an XPLedger row for history on the profile.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkAndAwardBadges } from "./badge";

export type XpReason =
  | "POST_CREATED"
  | "COMMENT_CREATED"
  | "CHECKIN"
  | "BEST_ANSWER"
  | "SUBMISSION_APPROVED"
  | "ADMIN_GRANT"
  | "ADMIN_PENALTY";

export const XP_BASE: Record<XpReason, number> = {
  POST_CREATED: 5,
  COMMENT_CREATED: 2,
  CHECKIN: 5,
  BEST_ANSWER: 10,
  SUBMISSION_APPROVED: 10,
  ADMIN_GRANT: 0, // admin specifies amount
  ADMIN_PENALTY: 0,
};

export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 90) return 1.5;
  if (streakDays >= 30) return 1.2;
  if (streakDays >= 7) return 1.1;
  return 1.0;
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

/**
 * Award XP to a user in the context of a community.
 * No-op when user isn't a member (XP only exists per-membership).
 */
export async function awardXp(input: {
  userId: string;
  communityId: string;
  reason: XpReason;
  amount?: number; // overrides XP_BASE for ADMIN_GRANT/PENALTY
  reasonId?: string; // post/comment/checkin id for traceability
  /** Apply current streak multiplier (defaults to true for CHECKIN only). */
  applyStreakMultiplier?: boolean;
}) {
  const base = input.amount ?? XP_BASE[input.reason];
  if (base <= 0 && input.reason !== "ADMIN_PENALTY") return null;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: input.communityId,
      },
    },
    select: { id: true, xp: true, streakDays: true },
  });
  if (!membership) return null; // not a member — skip silently

  const applyMult =
    input.applyStreakMultiplier ?? input.reason === "CHECKIN";
  const mult = applyMult ? streakMultiplier(membership.streakDays) : 1.0;
  const amount = Math.round(base * mult);

  const nextXp = Math.max(0, membership.xp + amount);
  const nextLevel = levelFromXp(nextXp);

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: membership.id },
      data: {
        xp: nextXp,
        level: nextLevel,
        lastActiveAt: new Date(),
      },
    }),
    prisma.xPLedger.create({
      data: {
        userId: input.userId,
        amount,
        reason: input.reason,
        reasonId: input.reasonId ?? null,
      },
    }),
  ]);

  logger.info(
    {
      userId: input.userId,
      communityId: input.communityId,
      reason: input.reason,
      amount,
      mult,
      newXp: nextXp,
      newLevel: nextLevel,
    },
    "[xp] awarded"
  );

  // Non-blocking badge check after every XP award
  checkAndAwardBadges({
    userId: input.userId,
    communityId: input.communityId,
  }).catch((err) => logger.warn({ err }, "[xp] badge check failed"));

  return { amount, newXp: nextXp, newLevel: nextLevel, multiplier: mult };
}

/**
 * List recent XP entries for a user (all communities, flat).
 * Profile page will call this to render an "XP log" tab.
 */
export async function listRecentXp(input: {
  userId: string;
  limit?: number;
}) {
  return prisma.xPLedger.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 30,
  });
}

/**
 * Bump the user's community streak based on time since lastActiveAt:
 *   < 24h: already active today — no change
 *   24–48h: yesterday — streakDays++
 *   > 48h: broken — streakDays reset to 1
 *
 * Call this BEFORE awardXp on a CHECKIN event so the multiplier uses
 * the freshly-incremented streak.
 */
export async function bumpCommunityStreak(input: {
  userId: string;
  communityId: string;
}): Promise<{ streakDays: number } | null> {
  const m = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: input.communityId,
      },
    },
    select: { id: true, streakDays: true, lastActiveAt: true },
  });
  if (!m) return null;

  const hoursSince = (Date.now() - m.lastActiveAt.getTime()) / 3_600_000;
  let next = m.streakDays;
  if (hoursSince < 24) {
    // same day, keep streak
  } else if (hoursSince < 48) {
    next = m.streakDays + 1;
  } else {
    next = 1; // broken — restart
  }

  if (next !== m.streakDays) {
    await prisma.membership.update({
      where: { id: m.id },
      data: { streakDays: next },
    });
  }
  return { streakDays: next };
}
