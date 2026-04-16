/**
 * Challenge service — streak, progress, check-in, membership.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
  todayTask: {
    id: string;
    dayNumber: number;
    title: string;
    label: string | null;
  } | null;
  checkedInToday: boolean;
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
  if (!member || !member.personalStartsAt) return null;

  const ch = member.challenge;
  const startDay = new Date(member.personalStartsAt);
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

  // Check if user already checked in today
  const checkinToday = await prisma.checkin.findFirst({
    where: {
      userId,
      challengeId: ch.id,
      createdAt: {
        gte: today,
      },
    },
    select: { id: true },
  });

  return {
    memberId: member.id,
    challengeId: ch.id,
    challengeSlug: ch.slug,
    challengeTitle: ch.title,
    difficulty: ch.difficulty,
    requiredDays: ch.requiredDays,
    personalStartsAt: member.personalStartsAt,
    currentDay,
    progressPct,
    streak: Math.max(0, (member.consecutiveMissed ?? 0) === 0 ? currentDay : 0),
    todayTask: todayTask
      ? {
          id: todayTask.id,
          dayNumber: todayTask.dayNumber,
          title: todayTask.title,
          label: todayTask.label,
        }
      : null,
    checkedInToday: !!checkinToday,
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
}) {
  const { userId, challengeId, content } = params;
  const member = await prisma.challengeMember.findFirst({
    where: { userId, challengeId, status: "ACTIVE" },
  });
  if (!member) throw new Error("not_a_member");
  if (!member.personalStartsAt) throw new Error("challenge_not_started");

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
    select: { requiredDays: true },
  });
  const elapsedDays = Math.floor(
    (today.getTime() - member.personalStartsAt.getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const currentDay = Math.min(
    challenge?.requiredDays ?? 999,
    Math.max(1, elapsedDays + 1)
  );
  const isFinalDay =
    challenge?.requiredDays !== undefined &&
    currentDay >= challenge.requiredDays;

  await prisma.$transaction(async (tx) => {
    await tx.checkin.create({
      data: {
        userId,
        challengeId,
        content,
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
  return { ok: true, completed: isFinalDay };
}
