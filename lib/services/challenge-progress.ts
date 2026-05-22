/**
 * Challenge progress — streak computation, check-in submission, active challenge state.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { awardXp, bumpCommunityStreak } from "./xp";

export interface ActiveChallenge {
  memberId: string;
  challengeId: string;
  challengeSlug: string;
  challengeTitle: string;
  difficulty: string;
  requiredDays: number;
  personalStartsAt: Date;
  currentDay: number;
  progressPct: number;
  streak: number;
  missedDays: number; // days from start to yesterday without any check-in
  todayTask: {
    id: string;
    dayNumber: number;
    title: string;
    label: string | null;
  } | null;
  checkedInToday: boolean;
}

/**
 * Resolve the effective "Day 1 starts at" timestamp for a challenge member.
 *
 * - If member already has personalStartsAt set → return it as-is.
 * - Else, if the challenge has autoStartAfterHours grace:
 *     * Inside grace window → return null (still waiting; member may press "Bắt đầu").
 *     * Past grace → return joinedAt + grace (deterministic; NOT `now`).
 * - Else (manual mode, no grace) → return null forever (member must press Start).
 *
 * Pure function — callers persist the result lazily inside getActiveChallenge.
 */
export function effectivePersonalStartsAt(
  member: { joinedAt: Date; personalStartsAt: Date | null },
  challenge: { autoStartAfterHours: number | null },
  now: Date = new Date()
): Date | null {
  if (member.personalStartsAt) return member.personalStartsAt;
  const grace = challenge.autoStartAfterHours;
  if (grace == null || grace <= 0) return null;
  const deadline = new Date(member.joinedAt.getTime() + grace * 3600_000);
  if (now < deadline) return null;
  return deadline;
}

/**
 * Compute consecutive-day streak ending at the most recent check-in.
 * Given checkins sorted asc, returns the longest run of consecutive days
 * ending at the last check-in day.
 */
export function computeStreak(checkinDays: number[]): number {
  if (checkinDays.length === 0) return 0;
  const sorted = [...new Set(checkinDays)].sort((a, b) => a - b);
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i] - sorted[i - 1] === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Get current active challenge for a user within a community.
 * Returns the most recently joined ACTIVE challenge, or null if none.
 */
export async function getActiveChallenge(
  userId: string,
  communityId: string
): Promise<ActiveChallenge | null> {
  const member = await prisma.challengeMember.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      challenge: { communityId },
    },
    orderBy: { joinedAt: "desc" },
    include: {
      challenge: {
        include: {
          tasks: { orderBy: { dayNumber: "asc" } },
        },
      },
    },
  });
  if (!member) return null;

  const ch = member.challenge;
  const effStart = effectivePersonalStartsAt(member, ch);
  if (!effStart) return null;

  // Lazy-persist auto-start so leaderboard/queries converge on a single source of truth.
  // Fire-and-forget: the deadline is deterministic so a lost write retries on next visit.
  if (!member.personalStartsAt) {
    prisma.challengeMember
      .update({ where: { id: member.id }, data: { personalStartsAt: effStart } })
      .catch(() => {});
  }

  const startDay = new Date(effStart);
  startDay.setHours(0, 0, 0, 0);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const elapsedDays = Math.floor(
    (today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)
  );
  const currentDay = Math.min(ch.requiredDays, Math.max(1, elapsedDays + 1));
  const progressPct = Math.round((currentDay / ch.requiredDays) * 100);

  const todayTask = ch.tasks.find((t) => t.dayNumber === currentDay) || null;

  // Load all my check-ins for this challenge (lightweight)
  const myCheckins = await prisma.checkin.findMany({
    where: { userId, challengeId: ch.id },
    select: { dayNumber: true, createdAt: true },
  });
  const dayNumbers = myCheckins
    .map((c) => c.dayNumber ?? null)
    .filter((n): n is number => n !== null);
  const checkedInToday = myCheckins.some(
    (c) => c.createdAt.getTime() >= today.getTime()
  );
  const streak = computeStreak(dayNumbers);
  // Missed days = days from 1..(currentDay-1) that have no check-in
  const doneSet = new Set(dayNumbers);
  let missedDays = 0;
  for (let d = 1; d < currentDay; d++) {
    if (!doneSet.has(d)) missedDays++;
  }

  return {
    memberId: member.id,
    challengeId: ch.id,
    challengeSlug: ch.slug,
    challengeTitle: ch.title,
    difficulty: ch.difficulty,
    requiredDays: ch.requiredDays,
    personalStartsAt: effStart,
    currentDay,
    progressPct,
    streak,
    missedDays,
    todayTask: todayTask
      ? {
          id: todayTask.id,
          dayNumber: todayTask.dayNumber,
          title: todayTask.title,
          label: todayTask.label,
        }
      : null,
    checkedInToday,
  };
}

/**
 * Submit a check-in. Creates a Checkin record and updates member streak.
 * Returns success flag + streak info.
 */
export async function submitCheckin(params: {
  userId: string;
  challengeId: string;
  content: string;
  taskId?: string;
  dayNumber?: number;
  linkUrl?: string;
  imageUrl?: string;
}) {
  const { userId, challengeId, content, taskId, dayNumber, linkUrl, imageUrl } =
    params;

  // Plan gate — refuse checkin if community plan is expired/pending
  const challengeMeta = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { communityId: true },
  });
  if (challengeMeta) {
    const { assertCommunityCanWrite } = await import("./community");
    await assertCommunityCanWrite(challengeMeta.communityId);
  }

  const member = await prisma.challengeMember.findFirst({
    where: { userId, challengeId, status: "ACTIVE" },
  });
  if (!member) throw new Error("not_a_member");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.checkin.findFirst({
    where: {
      userId,
      challengeId,
      createdAt: { gte: today },
    },
  });
  if (existing) {
    return { ok: false, reason: "already_checked_in_today" };
  }

  // Calculate if this check-in completes the challenge
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { requiredDays: true, autoStartAfterHours: true },
  });
  if (!challenge) throw new Error("challenge_not_found");

  const effStart = effectivePersonalStartsAt(member, challenge);
  if (!effStart) throw new Error("challenge_not_started");

  const elapsedDays = Math.floor(
    (today.getTime() - effStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const currentDay = Math.min(
    challenge.requiredDays,
    Math.max(1, elapsedDays + 1)
  );
  const isFinalDay = currentDay >= challenge.requiredDays;

  await prisma.$transaction(async (tx) => {
    await tx.checkin.create({
      data: {
        userId,
        challengeId,
        content,
        taskId: taskId ?? null,
        dayNumber: dayNumber ?? null,
        linkUrl: linkUrl ?? null,
        imageUrl: imageUrl ?? null,
      },
    });
    await tx.challengeMember.update({
      where: { id: member.id },
      data: {
        lastCheckinAt: new Date(),
        consecutiveMissed: 0,
        ...(isFinalDay
          ? { status: "COMPLETED", completedAt: new Date() }
          : {}),
      },
    });
  });

  logger.info(
    { userId, challengeId, completed: isFinalDay },
    "[challenge] checkin submitted"
  );

  // Bump streak first, then award XP (multiplier uses the freshly bumped streak)
  const challengeCommunity = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { communityId: true },
  });
  if (challengeCommunity) {
    try {
      await bumpCommunityStreak({
        userId,
        communityId: challengeCommunity.communityId,
      });
      await awardXp({
        userId,
        communityId: challengeCommunity.communityId,
        reason: "CHECKIN",
      });
    } catch (err) {
      logger.warn({ err }, "[checkin] streak/XP update failed");
    }
  }

  return { ok: true, completed: isFinalDay };
}
