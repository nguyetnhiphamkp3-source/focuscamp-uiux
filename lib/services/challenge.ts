/**
 * Challenge service — streak, progress, check-in, membership.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createNotification } from "./notification";
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
    personalStartsAt: member.personalStartsAt,
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

/**
 * Get per-challenge leaderboard: top members by streak (tiebreak by checkin count).
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit: number = 10
) {
  const members = await prisma.challengeMember.findMany({
    where: { challengeId, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  // Fetch all checkins once
  const checkins = await prisma.checkin.findMany({
    where: { challengeId },
    select: { userId: true, dayNumber: true, createdAt: true },
  });
  const byUser = new Map<string, number[]>();
  for (const c of checkins) {
    if (c.dayNumber == null) continue;
    if (!byUser.has(c.userId)) byUser.set(c.userId, []);
    byUser.get(c.userId)!.push(c.dayNumber);
  }

  const rows = members.map((m) => {
    const days = byUser.get(m.userId) ?? [];
    return {
      userId: m.userId,
      name: m.user.name || m.user.email || "Member",
      image: m.user.image,
      status: m.status,
      completedAt: m.completedAt,
      currentDay: days.length ? Math.max(...days) : 0,
      streak: computeStreak(days),
      totalCheckins: days.length,
    };
  });

  rows.sort((a, b) => {
    if (a.status === "COMPLETED" && b.status !== "COMPLETED") return -1;
    if (b.status === "COMPLETED" && a.status !== "COMPLETED") return 1;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return b.totalCheckins - a.totalCheckins;
  });

  return rows.slice(0, limit);
}

/* ===== Phase C — Admin review of submissions (check-ins) ===== */

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

async function assertChallengeAdmin(userId: string, challengeId: string) {
  const ch = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { community: { select: { ownerId: true } } },
  });
  if (!ch) throw new Error("Challenge không tồn tại");
  // Admin = community owner. (Future: add mod roles.)
  if (ch.community.ownerId !== userId) {
    throw new Error("Chỉ admin cộng đồng mới review submission");
  }
  return ch;
}

/**
 * List check-ins (submissions) of a challenge, optionally filtered by status.
 * Returns newest first with user + task for display.
 */
export async function listChallengeSubmissions(input: {
  challengeId: string;
  status?: SubmissionStatus | "ALL";
  limit?: number;
  offset?: number;
}) {
  const { challengeId, status = "ALL", limit = 50, offset = 0 } = input;
  const [rows, total, pendingCount] = await Promise.all([
    prisma.checkin.findMany({
      where: {
        challengeId,
        ...(status !== "ALL" ? { status } : {}),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        task: { select: { id: true, dayNumber: true, title: true, label: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.checkin.count({ where: { challengeId } }),
    prisma.checkin.count({ where: { challengeId, status: "PENDING" } }),
  ]);
  return { rows, total, pendingCount };
}

/**
 * Review a submission — approve or reject. Admin/owner only.
 * On reject, a non-empty note is required (explain why so user can resubmit).
 */
export async function reviewSubmission(input: {
  userId: string;
  checkinId: string;
  action: "APPROVE" | "REJECT";
  note?: string;
}) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  await assertChallengeAdmin(input.userId, checkin.challengeId);

  if (input.action === "REJECT" && !input.note?.trim()) {
    throw new Error("Vui lòng ghi note khi reject để người làm biết cần sửa gì");
  }

  const updated = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: {
      status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedById: input.userId,
      reviewedAt: new Date(),
      reviewNote: input.note?.trim() || null,
      ...(input.action === "REJECT" ? { rejectCount: { increment: 1 } } : {}),
    },
  });
  logger.info(
    {
      checkinId: input.checkinId,
      action: input.action,
      reviewer: input.userId,
      submitter: checkin.userId,
    },
    "[challenge] submission reviewed"
  );

  // Notify the submitter
  const ctx = await prisma.challenge.findUnique({
    where: { id: checkin.challengeId },
    select: {
      slug: true,
      title: true,
      community: { select: { slug: true } },
    },
  });
  if (ctx) {
    await createNotification({
      userId: checkin.userId,
      type: input.action === "APPROVE" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
      title:
        input.action === "APPROVE"
          ? `Submission của bạn được duyệt ✓ (${ctx.title})`
          : `Submission của bạn bị từ chối ✕ (${ctx.title})`,
      body: input.note?.trim() || undefined,
      actorId: input.userId,
      link: `/c/${ctx.community.slug}/challenges/${ctx.slug}`,
      communitySlug: ctx.community.slug,
    });

    // Award bonus XP on approve (on top of the base CHECKIN XP from submit)
    if (input.action === "APPROVE") {
      const challengeRow = await prisma.challenge.findUnique({
        where: { id: checkin.challengeId },
        select: { communityId: true },
      });
      if (challengeRow) {
        awardXp({
          userId: checkin.userId,
          communityId: challengeRow.communityId,
          reason: "SUBMISSION_APPROVED",
          reasonId: input.checkinId,
        }).catch((err) =>
          logger.warn({ err }, "[review] approve XP failed")
        );
      }
    }
  }

  return updated;
}

/**
 * Flag a check-in as PENDING (removes any prior approval). Admin-only.
 * Useful when admin notices something suspicious on a previously-auto-approved
 * check-in and wants to pull it back for manual review.
 */
export async function flagSubmissionForReview(input: {
  userId: string;
  checkinId: string;
}) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  await assertChallengeAdmin(input.userId, checkin.challengeId);

  const updated = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: {
      status: "PENDING",
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
    },
  });
  logger.info(
    { checkinId: input.checkinId, by: input.userId },
    "[challenge] submission flagged for review"
  );
  return updated;
}

/**
 * Bulk approve all PENDING check-ins of a challenge. Admin-only.
 * Convenience when admin trusts the latest batch.
 */
export async function approveAllPending(input: {
  userId: string;
  challengeId: string;
}) {
  await assertChallengeAdmin(input.userId, input.challengeId);
  const res = await prisma.checkin.updateMany({
    where: { challengeId: input.challengeId, status: "PENDING" },
    data: {
      status: "APPROVED",
      reviewedById: input.userId,
      reviewedAt: new Date(),
    },
  });
  logger.info(
    { challengeId: input.challengeId, count: res.count, by: input.userId },
    "[challenge] bulk approve pending"
  );
  return { count: res.count };
}

/* ===== Admin: member request review (Phase C-2) ===== */

export async function listPendingMembers(challengeId: string) {
  return prisma.challengeMember.findMany({
    where: { challengeId, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, image: true, email: true, handle: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function approveChallengeMember(input: {
  userId: string;
  memberId: string;
}) {
  const member = await prisma.challengeMember.findUnique({
    where: { id: input.memberId },
    include: { challenge: { include: { community: { select: { ownerId: true, slug: true } } } } },
  });
  if (!member) throw new Error("Member không tồn tại");
  if (member.challenge.community.ownerId !== input.userId) {
    throw new Error("Chỉ admin cộng đồng mới duyệt được");
  }
  const updated = await prisma.challengeMember.update({
    where: { id: input.memberId },
    data: {
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedById: input.userId,
      personalStartsAt: new Date(), // approval = ready to play
    },
  });
  logger.info(
    { memberId: input.memberId, approvedBy: input.userId },
    "[challenge] member approved"
  );

  // Notify applicant
  await createNotification({
    userId: member.userId,
    type: "SUBMISSION_APPROVED",
    title: `Bạn đã được duyệt vào challenge: ${member.challenge.title}`,
    actorId: input.userId,
    link: `/c/${member.challenge.community.slug}/challenges/${member.challenge.slug}`,
    communitySlug: member.challenge.community.slug,
  });

  return updated;
}

export async function rejectChallengeMember(input: {
  userId: string;
  memberId: string;
  note?: string;
}) {
  const member = await prisma.challengeMember.findUnique({
    where: { id: input.memberId },
    include: { challenge: { include: { community: { select: { ownerId: true, slug: true } } } } },
  });
  if (!member) throw new Error("Member không tồn tại");
  if (member.challenge.community.ownerId !== input.userId) {
    throw new Error("Chỉ admin cộng đồng mới từ chối được");
  }
  const updated = await prisma.challengeMember.update({
    where: { id: input.memberId },
    data: {
      status: "REJECTED",
      rejectNote: input.note?.trim() || null,
    },
  });
  logger.info(
    { memberId: input.memberId, by: input.userId },
    "[challenge] member rejected"
  );

  await createNotification({
    userId: member.userId,
    type: "SUBMISSION_REJECTED",
    title: `Bạn bị từ chối vào challenge: ${member.challenge.title}`,
    body: input.note?.trim() || undefined,
    actorId: input.userId,
    link: `/c/${member.challenge.community.slug}/challenges/${member.challenge.slug}`,
    communitySlug: member.challenge.community.slug,
  });

  return updated;
}

/* ===== Admin: challenge settings + task CRUD ===== */

export async function updateChallengeSettings(input: {
  userId: string;
  challengeId: string;
  requiresApproval?: boolean;
  title?: string;
  description?: string;
  freezeFromDay?: number | null;
  freezeStartsAt?: string | null;
  freezeEndsAt?: string | null;
}) {
  const ch = await assertChallengeAdmin(input.userId, input.challengeId);
  await prisma.challenge.update({
    where: { id: input.challengeId },
    data: {
      ...(input.requiresApproval !== undefined
        ? { requiresApproval: input.requiresApproval }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.freezeFromDay !== undefined
        ? { freezeFromDay: input.freezeFromDay }
        : {}),
      ...(input.freezeStartsAt !== undefined
        ? {
            freezeStartsAt: input.freezeStartsAt
              ? new Date(input.freezeStartsAt)
              : null,
          }
        : {}),
      ...(input.freezeEndsAt !== undefined
        ? {
            freezeEndsAt: input.freezeEndsAt
              ? new Date(input.freezeEndsAt)
              : null,
          }
        : {}),
    },
  });
  logger.info(
    { challengeId: input.challengeId, by: input.userId },
    "[challenge] settings updated"
  );
  return ch;
}

export async function updateChallengeTask(input: {
  userId: string;
  taskId: string;
  title?: string;
  description?: string;
  sopContent?: string;
  videoUrl?: string;
  evidenceType?: string;
  evidenceLabel?: string;
  label?: string;
}) {
  const task = await prisma.challengeTask.findUnique({
    where: { id: input.taskId },
    select: { challengeId: true },
  });
  if (!task) throw new Error("Task không tồn tại");
  await assertChallengeAdmin(input.userId, task.challengeId);

  const updated = await prisma.challengeTask.update({
    where: { id: input.taskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.sopContent !== undefined
        ? { sopContent: input.sopContent || null }
        : {}),
      ...(input.videoUrl !== undefined
        ? { videoUrl: input.videoUrl || null }
        : {}),
      ...(input.evidenceType !== undefined
        ? { evidenceType: input.evidenceType }
        : {}),
      ...(input.evidenceLabel !== undefined
        ? { evidenceLabel: input.evidenceLabel || null }
        : {}),
      ...(input.label !== undefined ? { label: input.label || null } : {}),
    },
  });
  logger.info(
    { taskId: input.taskId, by: input.userId },
    "[challenge] task updated"
  );
  return updated;
}

/* ===== Checkin voting ===== */

export async function toggleCheckinVote(input: {
  userId: string;
  checkinId: string;
}) {
  // Must be a member of the community that owns this challenge
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
    include: { challenge: { select: { communityId: true } } },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: checkin.challenge.communityId,
      },
    },
  });
  if (!membership) throw new Error("Phải là thành viên cộng đồng mới vote được");

  const existing = await prisma.checkinVote.findUnique({
    where: {
      checkinId_userId: { checkinId: input.checkinId, userId: input.userId },
    },
  });
  if (existing) {
    await prisma.checkinVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.checkinVote.create({
      data: { checkinId: input.checkinId, userId: input.userId },
    });
  }
  const count = await prisma.checkinVote.count({
    where: { checkinId: input.checkinId },
  });
  return { voted: !existing, count };
}

/* ===== Resubmit after reject ===== */

const REJECT_CAP = 2;

export async function resubmitCheckin(input: {
  userId: string;
  checkinId: string;
  content: string;
  linkUrl?: string;
  imageUrl?: string;
}) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  if (checkin.userId !== input.userId)
    throw new Error("Chỉ tác giả mới nộp lại được");
  if (checkin.status !== "REJECTED")
    throw new Error("Chỉ nộp lại được checkin đã bị từ chối");
  if (checkin.rejectCount >= REJECT_CAP) {
    throw new Error(
      `Đã nộp lại ${REJECT_CAP} lần — liên hệ admin / cần thanh toán để resubmit (Phase 2)`
    );
  }

  const updated = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: {
      content: input.content.trim(),
      linkUrl: input.linkUrl?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      status: "PENDING",
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      // rejectCount persists — it counts "this submission has been rejected N times"
    },
  });
  logger.info(
    { checkinId: input.checkinId, by: input.userId, rejectCount: checkin.rejectCount },
    "[challenge] submission resubmitted"
  );
  return updated;
}

/* ===== Create challenge + task CRUD ===== */

async function assertCommunityOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== userId)
    throw new Error("Chỉ admin cộng đồng mới tạo challenge");
}

export async function createChallenge(input: {
  userId: string;
  communityId: string;
  slug: string;
  title: string;
  description?: string;
  difficulty?: string;
  requiredDays?: number;
  requiresApproval?: boolean;
}) {
  await assertCommunityOwner(input.userId, input.communityId);
  // Check slug uniqueness WITHIN this community
  const existing = await prisma.challenge.findFirst({
    where: { communityId: input.communityId, slug: input.slug },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Slug "${input.slug}" đã tồn tại trong cộng đồng này`);
  }
  const ch = await prisma.challenge.create({
    data: {
      communityId: input.communityId,
      slug: input.slug,
      title: input.title,
      description: input.description?.trim() || null,
      difficulty: input.difficulty || "NORMAL",
      requiredDays: input.requiredDays ?? 21,
      requiresApproval: input.requiresApproval ?? false,
      leaderId: input.userId,
      status: "OPEN",
    },
  });
  logger.info(
    { challengeId: ch.id, communityId: input.communityId, by: input.userId },
    "[challenge] created"
  );
  return ch;
}

export async function createChallengeTask(input: {
  userId: string;
  challengeId: string;
  dayNumber: number;
  title: string;
  description?: string;
  sopContent?: string;
  videoUrl?: string;
  evidenceType?: string;
  evidenceLabel?: string;
  label?: string;
}) {
  await assertChallengeAdmin(input.userId, input.challengeId);
  // dayNumber must be unique per challenge (schema @@unique(challengeId, dayNumber))
  const task = await prisma.challengeTask.create({
    data: {
      challengeId: input.challengeId,
      dayNumber: input.dayNumber,
      title: input.title,
      description: input.description?.trim() || null,
      sopContent: input.sopContent?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      evidenceType: input.evidenceType || "TEXT",
      evidenceLabel: input.evidenceLabel?.trim() || null,
      label: input.label?.trim() || null,
    },
  });
  logger.info(
    { taskId: task.id, challengeId: input.challengeId, by: input.userId },
    "[challenge] task created"
  );
  return task;
}

export async function deleteChallengeTask(input: {
  userId: string;
  taskId: string;
}) {
  const task = await prisma.challengeTask.findUnique({
    where: { id: input.taskId },
    select: { challengeId: true },
  });
  if (!task) throw new Error("Task không tồn tại");
  await assertChallengeAdmin(input.userId, task.challengeId);
  await prisma.challengeTask.delete({ where: { id: input.taskId } });
  logger.info(
    { taskId: input.taskId, by: input.userId },
    "[challenge] task deleted"
  );
}
