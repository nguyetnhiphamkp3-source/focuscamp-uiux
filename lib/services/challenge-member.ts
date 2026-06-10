/**
 * Challenge member management — join/approve/reject flows, admin helpers,
 * submission review, settings, task CRUD, voting, resubmit.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { createNotification } from "./notification";
import { awardXp } from "./xp";
import { assertCommunityCanWrite } from "./community";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";
import { deleteReplacedMediaUrl } from "@/lib/media-cleanup";
import { checkinImages } from "@/lib/checkin-images";
import { canResubmitCheckin } from "@/lib/checkin-resubmit-state";
import {
  canStartChallengeNow,
  challengeTaskDeadline,
  effectivePersonalStartsAt,
  hasCalendarDeadline,
  isLateSubmission,
} from "./challenge-progress";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

type CheckinLateFields = {
  userId: string;
  dayNumber: number | null;
  createdAt: Date;
  resubmittedAt: Date | null;
  lateWaivedAt: Date | null;
};

type ChallengeLateContext = {
  autoStartAfterHours: number | null;
  taskUnlockMode: string | null;
};

type MemberLateContext = {
  joinedAt: Date;
  personalStartsAt: Date | null;
};

export async function assertChallengeAdmin(userId: string, challengeId: string) {
  const ch = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      community: {
        select: {
          ownerId: true,
          memberships: { where: { userId }, select: { role: true } },
        },
      },
    },
  });
  if (!ch) throw new Error("Challenge không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: ch.community.ownerId === userId,
    membershipRole: ch.community.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_challenges")) {
    throw new Error("Chỉ admin cộng đồng mới quản lý challenge");
  }
  return ch;
}

async function assertChallengeReviewer(userId: string, challengeId: string) {
  const ch = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      community: {
        select: {
          ownerId: true,
          memberships: { where: { userId }, select: { role: true } },
        },
      },
    },
  });
  if (!ch) throw new Error("Challenge không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: ch.community.ownerId === userId,
    membershipRole: ch.community.memberships[0]?.role,
  });
  if (!canCommunity(role, "review_submissions")) {
    throw new Error("Chỉ admin cộng đồng mới review submission");
  }
  return ch;
}

async function assertCommunityOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      ownerId: true,
      memberships: { where: { userId }, select: { role: true } },
    },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: c.ownerId === userId,
    membershipRole: c.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_challenges"))
    throw new Error("Chỉ admin cộng đồng mới tạo challenge");
}

function submittedAt(checkin: { createdAt: Date; resubmittedAt: Date | null }): Date {
  return checkin.resubmittedAt ?? checkin.createdAt;
}

function checkinIsLate(
  checkin: CheckinLateFields,
  challenge: ChallengeLateContext,
  member: MemberLateContext | null,
): boolean {
  if (checkin.dayNumber == null || !hasCalendarDeadline(challenge.taskUnlockMode)) {
    return false;
  }
  if (!member) return false;
  const effStart = effectivePersonalStartsAt(member, challenge);
  if (!effStart) return false;
  return isLateSubmission({
    submittedAt: submittedAt(checkin),
    deadlineAt: challengeTaskDeadline(effStart, checkin.dayNumber),
    lateWaivedAt: checkin.lateWaivedAt,
  });
}

/* ===== Admin: member request review ===== */

export async function listPendingMembers(challengeId: string) {
  return prisma.challengeMember.findMany({
    where: { challengeId, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, image: true, email: true, handle: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function assertChallengeMemberHasCommunityMembership(
  tx: Prisma.TransactionClient,
  challengeMemberId: string,
) {
  const member = await tx.challengeMember.findUnique({
    where: { id: challengeMemberId },
    select: {
      userId: true,
      challenge: { select: { communityId: true } },
    },
  });
  if (!member) throw new Error("challenge_member_not_found");

  const membership = await tx.membership.findUnique({
    where: {
      userId_communityId: {
        userId: member.userId,
        communityId: member.challenge.communityId,
      },
    },
    select: { id: true },
  });
  if (!membership) throw new Error("not_a_member");

  return member;
}

export async function approveChallengeMember(input: {
  userId: string;
  memberId: string;
}) {
  const member = await prisma.challengeMember.findUnique({
    where: { id: input.memberId },
    include: {
      challenge: {
        include: {
          community: {
            select: {
              ownerId: true,
              slug: true,
              memberships: { where: { userId: input.userId }, select: { role: true } },
            },
          },
        },
      },
    },
  });
  if (!member) throw new Error("Member không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: member.challenge.community.ownerId === input.userId,
    membershipRole: member.challenge.community.memberships[0]?.role,
  });
  if (!canCommunity(role, "review_challenge_members")) {
    throw new Error("Chỉ admin cộng đồng mới duyệt được");
  }
  const applicantMembership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: member.userId,
        communityId: member.challenge.communityId,
      },
    },
    select: { id: true },
  });
  if (!applicantMembership) throw new Error("applicant_not_community_member");

  const updated = await prisma.challengeMember.update({
    where: { id: input.memberId },
    data: {
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedById: input.userId,
      // Don't set personalStartsAt — member presses "Bắt đầu" themselves
      // (or it auto-fires via Challenge.autoStartAfterHours grace).
    },
  });
  logger.info(
    { memberId: input.memberId, approvedBy: input.userId },
    "[challenge] member approved"
  );

  // Notify applicant without exposing the specific admin account.
  if (input.userId !== member.userId) {
    await createNotification({
      userId: member.userId,
      type: "SUBMISSION_APPROVED",
      title: `Admin đã duyệt bạn vào challenge: ${member.challenge.title}`,
      link: `/c/${member.challenge.community.slug}/challenges/${member.challenge.slug}`,
      communitySlug: member.challenge.community.slug,
    });
  }

  return updated;
}

export async function rejectChallengeMember(input: {
  userId: string;
  memberId: string;
  note?: string;
}) {
  const member = await prisma.challengeMember.findUnique({
    where: { id: input.memberId },
    include: {
      challenge: {
        include: {
          community: {
            select: {
              ownerId: true,
              slug: true,
              memberships: { where: { userId: input.userId }, select: { role: true } },
            },
          },
        },
      },
    },
  });
  if (!member) throw new Error("Member không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: member.challenge.community.ownerId === input.userId,
    membershipRole: member.challenge.community.memberships[0]?.role,
  });
  if (!canCommunity(role, "review_challenge_members")) {
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

  if (input.userId !== member.userId) {
    await createNotification({
      userId: member.userId,
      type: "SUBMISSION_REJECTED",
      title: `Admin đã từ chối bạn vào challenge: ${member.challenge.title}`,
      body: input.note?.trim() || undefined,
      link: `/c/${member.challenge.community.slug}/challenges/${member.challenge.slug}`,
      communitySlug: member.challenge.community.slug,
    });
  }

  return updated;
}

/* ===== Admin: submission review ===== */

/**
 * List check-ins (submissions) of a challenge, optionally filtered by status.
 * Returns newest first with user + task for display.
 */
export async function listChallengeSubmissions(input: {
  challengeId: string;
  status?: SubmissionStatus | "ALL" | "AI_FLAGGED";
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const { challengeId, status = "ALL", limit = 50, offset = 0, search } = input;
  const statusWhere: Prisma.CheckinWhereInput =
    status === "AI_FLAGGED"
      ? {
          status: "PENDING",
          NOT: [{ aiReviewData: { equals: Prisma.DbNull } }],
        }
      : status !== "ALL"
        ? { status }
        : {};

  const searchWhere: Prisma.CheckinWhereInput =
    search?.trim()
      ? { user: { name: { contains: search.trim(), mode: "insensitive" } } }
      : {};

  const baseWhere: Prisma.CheckinWhereInput = {
    challengeId,
    ...statusWhere,
    ...searchWhere,
  };

  const [rows, total, pendingCount, aiFlaggedCount, challenge] = await Promise.all([
    prisma.checkin.findMany({
      where: baseWhere,
      include: {
        user: { select: { id: true, name: true, image: true } },
        task: { select: { id: true, dayNumber: true, title: true, label: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.checkin.count({ where: baseWhere }),
    prisma.checkin.count({ where: { challengeId, status: "PENDING" } }),
    prisma.checkin.count({
      where: {
        challengeId,
        status: "PENDING",
        NOT: [{ aiReviewData: { equals: Prisma.DbNull } }],
      },
    }),
    prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { autoStartAfterHours: true, taskUnlockMode: true },
    }),
  ]);

  const members =
    challenge && hasCalendarDeadline(challenge.taskUnlockMode) && rows.length > 0
      ? await prisma.challengeMember.findMany({
          where: {
            challengeId,
            userId: { in: [...new Set(rows.map((row) => row.userId))] },
          },
          select: { userId: true, joinedAt: true, personalStartsAt: true },
        })
      : [];
  const memberByUserId = new Map(members.map((member) => [member.userId, member]));
  return {
    rows: rows.map((row) => ({
      ...row,
      isLate: challenge
        ? checkinIsLate(row, challenge, memberByUserId.get(row.userId) ?? null)
        : false,
    })),
    total,
    pendingCount,
    aiFlaggedCount,
  };
}

/**
 * Lightweight review-panel counts (the two PENDING-derived numbers that
 * listChallengeSubmissions computes) WITHOUT the paginated row fetch. Review
 * mutations call this to return authoritative counts to the client so it can
 * reconcile its optimistic state instead of refetching the whole detail page.
 * The where-clauses are kept identical to listChallengeSubmissions so the
 * numbers never diverge.
 */
export async function getSubmissionReviewCounts(challengeId: string): Promise<{
  pendingCount: number;
  aiFlaggedCount: number;
}> {
  const [pendingCount, aiFlaggedCount] = await Promise.all([
    prisma.checkin.count({ where: { challengeId, status: "PENDING" } }),
    prisma.checkin.count({
      where: {
        challengeId,
        status: "PENDING",
        NOT: [{ aiReviewData: { equals: Prisma.DbNull } }],
      },
    }),
  ]);
  return { pendingCount, aiFlaggedCount };
}

/**
 * Recompute a member's COMPLETED status from their APPROVED distinct-day count.
 * Marks COMPLETED when approved days >= requiredDays; revokes back to ACTIVE if a
 * rejection dropped them below. Idempotent — safe to call after any review decision.
 */
async function recomputeMemberCompletion(userId: string, challengeId: string) {
  const challengeRow = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { requiredDays: true },
  });
  if (!challengeRow) return;
  const approvedDays = await prisma.checkin.findMany({
    where: { userId, challengeId, dayNumber: { not: null }, status: "APPROVED" },
    select: { dayNumber: true },
    distinct: ["dayNumber"],
  });
  if (approvedDays.length >= challengeRow.requiredDays) {
    const completion = await prisma.challengeMember.updateMany({
      where: { challengeId, userId, completedAt: null },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    // Only dispatch when this is a fresh completion (not already completed)
    if (completion.count > 0) {
      void (async () => {
        try {
          const [challenge, user] = await Promise.all([
            prisma.challenge.findUnique({
              where: { id: challengeId },
              select: { title: true, slug: true, communityId: true, community: { select: { slug: true } } },
            }),
            prisma.user.findUnique({
              where: { id: userId },
              select: { name: true, email: true },
            }),
          ]);
          if (!challenge) return;
          const displayName = user?.name || user?.email?.split("@")[0] || "Thành viên";
          const { dispatchToChannels } = await import("./external-notify");
          await dispatchToChannels(challenge.communityId, "challenge_completed", {
            title: `🏆 ${displayName} hoàn thành challenge!`,
            description: challenge.title,
            url: `/c/${challenge.community.slug}/challenges/${challenge.slug}`,
          }, { name: displayName, challenge: challenge.title }, { challengeId });
        } catch { /* non-blocking */ }
      })();
    }
  } else {
    await prisma.challengeMember.updateMany({
      where: { challengeId, userId, status: "COMPLETED" },
      data: { status: "ACTIVE", completedAt: null },
    });
  }
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
  internal?: boolean;
}) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  if (!input.internal) {
    await assertChallengeReviewer(input.userId, checkin.challengeId);
  }

  if (input.action === "REJECT" && !input.note?.trim()) {
    throw new Error("Vui lòng ghi note khi reject để người làm biết cần sửa gì");
  }

  const updated = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: {
      status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedById: input.internal ? null : input.userId,
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

  // Completion is driven by APPROVED count — recompute after every review decision.
  await recomputeMemberCompletion(checkin.userId, checkin.challengeId);

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
    const isAI = !!input.internal;
    const reviewerLabel = isAI ? "🤖 AI" : "Admin";
    if (input.internal || input.userId !== checkin.userId) {
      await createNotification({
        userId: checkin.userId,
        type: input.action === "APPROVE" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
        title:
          input.action === "APPROVE"
            ? `${reviewerLabel} đã duyệt submission của bạn ✓ (${ctx.title})`
            : `${reviewerLabel} đã từ chối submission của bạn ✕ (${ctx.title})`,
        body: input.note?.trim() || undefined,
        link: `/c/${ctx.community.slug}/challenges/${ctx.slug}`,
        communitySlug: ctx.community.slug,
      });
    }

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
 * A preserved reviewedAt marks this as a reopened pending row, so the member can
 * revise it; fresh pending submissions still have reviewedAt=null and stay locked.
 */
export async function flagSubmissionForReview(input: {
  userId: string;
  checkinId: string;
}) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  await assertChallengeReviewer(input.userId, checkin.challengeId);

  const updated = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: {
      status: "PENDING",
      reviewedById: checkin.reviewedById,
      reviewedAt: checkin.reviewedAt ?? new Date(),
      reviewNote: checkin.status === "REJECTED" ? checkin.reviewNote : null,
      aiReviewData: Prisma.DbNull,
    },
  });
  await recomputeMemberCompletion(checkin.userId, checkin.challengeId);
  logger.info(
    { checkinId: input.checkinId, by: input.userId },
    "[challenge] submission flagged for review"
  );

  const ctx = await prisma.challenge.findUnique({
    where: { id: checkin.challengeId },
    select: {
      slug: true,
      title: true,
      community: { select: { slug: true } },
    },
  });
  if (ctx && input.userId !== checkin.userId) {
    await createNotification({
      userId: checkin.userId,
      type: "SUBMISSION_REOPENED",
      title: `Admin đã đưa submission của bạn về chờ duyệt (${ctx.title})`,
      body: checkin.status === "REJECTED" ? checkin.reviewNote || undefined : undefined,
      link: `/c/${ctx.community.slug}/challenges/${ctx.slug}`,
      communitySlug: ctx.community.slug,
    });
  }
  return updated;
}

/**
 * Clear the "late" label for a submission. Reviewer-only; keeps the original
 * submission timestamp intact and stores a waiver instead of rewriting history.
 */
export async function clearCheckinLateFlag(input: {
  userId: string;
  checkinId: string;
}) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
    select: {
      id: true,
      challengeId: true,
      userId: true,
      dayNumber: true,
      createdAt: true,
      resubmittedAt: true,
      lateWaivedAt: true,
      challenge: {
        select: {
          autoStartAfterHours: true,
          taskUnlockMode: true,
        },
      },
    },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  await assertChallengeReviewer(input.userId, checkin.challengeId);

  const member =
    checkin.dayNumber != null && hasCalendarDeadline(checkin.challenge.taskUnlockMode)
      ? await prisma.challengeMember.findUnique({
          where: {
            challengeId_userId: {
              challengeId: checkin.challengeId,
              userId: checkin.userId,
            },
          },
          select: { joinedAt: true, personalStartsAt: true },
        })
      : null;
  if (!checkinIsLate(checkin, checkin.challenge, member)) {
    return checkin;
  }

  const updated = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: {
      lateWaivedAt: new Date(),
      lateWaivedById: input.userId,
    },
  });
  logger.info(
    { checkinId: input.checkinId, by: input.userId },
    "[challenge] submission late flag cleared",
  );
  return updated;
}

/**
 * Bulk approve all PENDING check-ins of a challenge. Admin-only.
 */
export async function approveAllPending(input: {
  userId: string;
  challengeId: string;
}) {
  await assertChallengeReviewer(input.userId, input.challengeId);
  // Capture affected submitters before flipping status so completion can be recomputed.
  const pendingUsers = await prisma.checkin.findMany({
    where: { challengeId: input.challengeId, status: "PENDING" },
    select: { userId: true },
    distinct: ["userId"],
  });
  const res = await prisma.checkin.updateMany({
    where: { challengeId: input.challengeId, status: "PENDING" },
    data: {
      status: "APPROVED",
      reviewedById: input.userId,
      reviewedAt: new Date(),
    },
  });
  // Set-based completion recompute for the affected submitters — replaces the
  // per-user serial recomputeMemberCompletion loop (O(distinct users) round-trips).
  // Bulk approve only ADDS approvals, so members can only complete, never revoke.
  await recomputeCompletionForUsers(
    input.challengeId,
    pendingUsers.map((u) => u.userId),
  );
  logger.info(
    { challengeId: input.challengeId, count: res.count, by: input.userId },
    "[challenge] bulk approve pending"
  );
  return { count: res.count };
}

/**
 * Bulk equivalent of recomputeMemberCompletion's COMPLETE branch for many users at
 * once: marks members COMPLETED when their distinct APPROVED-day count reaches
 * requiredDays. Used by approveAllPending to avoid an O(users) serial query storm.
 * Only completes (never revokes) — its single caller only adds approvals.
 */
async function recomputeCompletionForUsers(challengeId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  const challengeRow = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { requiredDays: true },
  });
  if (!challengeRow) return;

  // Distinct APPROVED days per affected user in one grouped query (matches the
  // distinct-dayNumber semantics of recomputeMemberCompletion).
  const dayCounts = await prisma.$queryRaw<{ userId: string; days: number }[]>`
    SELECT "userId", COUNT(DISTINCT "dayNumber")::int AS days
    FROM "Checkin"
    WHERE "challengeId" = ${challengeId}
      AND "status" = 'APPROVED'
      AND "dayNumber" IS NOT NULL
      AND "userId" IN (${Prisma.join(userIds)})
    GROUP BY "userId"
  `;
  const completeUserIds = dayCounts
    .filter((d) => Number(d.days) >= challengeRow.requiredDays)
    .map((d) => d.userId);
  if (completeUserIds.length === 0) return;

  // Complete atomically, then derive the freshly-completed set from the rows THIS
  // update actually flipped (members carrying the exact completedAt we just wrote).
  // Mirrors recomputeMemberCompletion's `completion.count > 0` gate and avoids a
  // TOCTOU where a concurrent reviewer's update would otherwise duplicate-dispatch.
  const completedAt = new Date();
  const flipped = await prisma.challengeMember.updateMany({
    where: { challengeId, userId: { in: completeUserIds }, completedAt: null },
    data: { status: "COMPLETED", completedAt },
  });
  if (flipped.count > 0) {
    const freshly = await prisma.challengeMember.findMany({
      where: { challengeId, userId: { in: completeUserIds }, completedAt },
      select: { userId: true },
    });
    if (freshly.length > 0) {
      void dispatchBulkCompletions(challengeId, freshly.map((m) => m.userId));
    }
  }
}

/**
 * Fire the "challenge_completed" external dispatch for a batch of freshly-completed
 * members (mirrors recomputeMemberCompletion's per-user dispatch). Non-blocking.
 */
async function dispatchBulkCompletions(challengeId: string, userIds: string[]) {
  try {
    const [challenge, users] = await Promise.all([
      prisma.challenge.findUnique({
        where: { id: challengeId },
        select: { title: true, slug: true, communityId: true, community: { select: { slug: true } } },
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);
    if (!challenge) return;
    const { dispatchToChannels } = await import("./external-notify");
    for (const user of users) {
      const displayName = user.name || user.email?.split("@")[0] || "Thành viên";
      await dispatchToChannels(
        challenge.communityId,
        "challenge_completed",
        {
          title: `🏆 ${displayName} hoàn thành challenge!`,
          description: challenge.title,
          url: `/c/${challenge.community.slug}/challenges/${challenge.slug}`,
        },
        { name: displayName, challenge: challenge.title },
        { challengeId },
      );
    }
  } catch {
    /* non-blocking */
  }
}

/* ===== Checkin voting ===== */

export async function toggleCheckinVote(input: {
  userId: string;
  checkinId: string;
}) {
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
  imageUrls?: string[];
}) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: input.checkinId },
  });
  if (!checkin) throw new Error("Check-in không tồn tại");
  if (checkin.userId !== input.userId)
    throw new Error("Chỉ tác giả mới nộp lại được");
  if (!canResubmitCheckin(checkin))
    throw new Error("Chỉ nộp lại được checkin bị từ chối hoặc được admin mở lại");
  if (checkin.rejectCount >= REJECT_CAP) {
    throw new Error(
      `Đã nộp lại ${REJECT_CAP} lần — liên hệ admin / cần thanh toán để resubmit (Phase 2)`
    );
  }

  const task = checkin.taskId
    ? await prisma.challengeTask.findFirst({
        where: { id: checkin.taskId, challengeId: checkin.challengeId },
        select: { evidenceType: true },
      })
    : null;
  const evidenceType = task?.evidenceType ?? "TEXT";
  const normalizedContent = input.content.trim();
  const hasText = normalizedContent.length >= 5;
  const hasPartialText =
    normalizedContent.length > 0 && normalizedContent.length < 5;
  const hasLink = !!input.linkUrl?.trim();
  const hasImage = (input.imageUrls?.length ?? 0) > 0;

  if (hasPartialText) throw new Error("Nội dung tối thiểu 5 ký tự");
  if (evidenceType === "TEXT" && !hasText) {
    throw new Error("Vui lòng nhập nội dung bằng chứng");
  }
  if (evidenceType === "LINK" && (!hasText || !hasLink)) {
    throw new Error("Vui lòng nhập nội dung và link bằng chứng");
  }
  if (evidenceType === "IMAGE" && (!hasText || !hasImage)) {
    throw new Error("Vui lòng nhập nội dung và upload ảnh bằng chứng");
  }
  if (evidenceType === "TEXT_IMAGE" && !hasText && !hasImage) {
    throw new Error("Vui lòng nhập text hoặc upload ảnh bằng chứng");
  }

  // Snapshot the rejected attempt before the row is overwritten, so the member
  // (and admin) keep a proof trail of what was submitted and why it was rejected.
  const prevHistory = Array.isArray(checkin.reviewHistory)
    ? (checkin.reviewHistory as unknown[])
    : [];
  const rejectedSnapshot =
    checkin.status === "REJECTED"
      ? {
          content: checkin.content,
          linkUrl: checkin.linkUrl,
          imageUrls: checkinImages(checkin),
          reviewNote: checkin.reviewNote,
          aiReviewData: checkin.aiReviewData ?? null,
          reviewedAt: checkin.reviewedAt?.toISOString() ?? null,
          rejectedAt: (checkin.reviewedAt ?? new Date()).toISOString(),
          attempt: checkin.rejectCount, // 1 = first rejection, 2 = second, ...
        }
      : null;

  const updated = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: {
      content: normalizedContent || "Đã upload ảnh bằng chứng",
      linkUrl: input.linkUrl?.trim() || null,
      imageUrls: input.imageUrls ?? [],
      // Migrate legacy single column off this row so a zero-image resubmit
      // can't resurrect a stale image via the checkinImages() fallback.
      imageUrl: null,
      status: "PENDING",
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      // Stale AI verdict is now preserved in reviewHistory; clear it so the row
      // doesn't show last attempt's review until the new one re-runs.
      aiReviewData: Prisma.DbNull,
      ...(rejectedSnapshot
        ? { reviewHistory: [...prevHistory, rejectedSnapshot] as Prisma.InputJsonValue }
        : {}),
      resubmittedAt: new Date(),
      lateWaivedAt: null,
      lateWaivedById: null,
    },
  });
  // Keep rejected-attempt media alive: reviewHistory stores these URLs as the
  // audit trail shown to members/admins after resubmit.
  logger.info(
    {
      checkinId: input.checkinId,
      by: input.userId,
      rejectCount: checkin.rejectCount,
      previousStatus: checkin.status,
    },
    "[challenge] submission resubmitted"
  );
  return updated;
}

/* ===== Create challenge + task CRUD ===== */

export async function createChallenge(input: {
  userId: string;
  communityId: string;
  slug: string;
  title: string;
  description?: string;
  difficulty?: string;
  requiredDays?: number;
  autoStartAfterHours?: number | null;
  bannerUrl?: string;
  taskUnlockMode?: string;
  unlockIntervalHours?: number;
}) {
  await assertCommunityOwner(input.userId, input.communityId);
  await assertCommunityCanWrite(input.communityId);
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
      autoStartAfterHours: input.autoStartAfterHours ?? null,
      bannerUrl: input.bannerUrl?.trim() || null,
      leaderId: input.userId,
      status: "OPEN",
      taskUnlockMode: input.taskUnlockMode || "DAILY",
      unlockIntervalHours: input.unlockIntervalHours ?? 24,
    },
  });
  logger.info(
    { challengeId: ch.id, communityId: input.communityId, by: input.userId },
    "[challenge] created"
  );
  return ch;
}

export type ChallengeEditorType = "USER" | "INTERNAL_AGENT" | "EXTERNAL_API";

export async function updateChallengeSettings(input: {
  userId: string;
  challengeId: string;
  autoStartAfterHours?: number | null;
  difficulty?: string;
  title?: string;
  description?: string;
  freezeFromDay?: number | null;
  freezeStartsAt?: string | null;
  freezeEndsAt?: string | null;
  bannerUrl?: string | null;
  bannerMediaType?: string;
  bannerVideoUrl?: string | null;
  featuredOnGlobal?: boolean;
  requiredTier?: string | null;
  pricingConfig?: Record<string, unknown> | null;
  taskUnlockMode?: string;
  unlockIntervalHours?: number;
  freezeWindows?: Array<{ label?: string; startsAt: string; endsAt: string }> | null;
  pitch?: string | null;
  benefits?: Array<{ icon?: string; text: string }> | null;
  bumpProductId?: string | null;
  aiReviewEnabled?: boolean;
  aiReviewThreshold?: number;
  aiReviewFallback?: string;
  aiReviewProvider?: string | null;
  aiReviewProviderId?: string | null;
  aiReviewModel?: string | null;
  /** Audit: who performed this edit. Defaults to USER. Pass INTERNAL_AGENT / EXTERNAL_API from agent paths. */
  actorType?: ChallengeEditorType;
  /** Audit: actor id (user id, or api key id for external). Defaults to input.userId. */
  actorId?: string;
}) {
  const ch = await assertChallengeAdmin(input.userId, input.challengeId);
  const actorType: ChallengeEditorType = input.actorType ?? "USER";
  const actorId = input.actorId ?? input.userId;
  if (input.aiReviewProviderId) {
    const provider = await prisma.aIProvider.findFirst({
      where: { id: input.aiReviewProviderId, communityId: ch.communityId },
      select: { id: true },
    });
    if (!provider) throw new Error("AI provider khong thuoc community nay");
  }
  // Empty benefits array = "reset to defaults" — store null so render falls back.
  const benefitsValue =
    input.benefits === undefined
      ? undefined
      : input.benefits === null || input.benefits.length === 0
        ? Prisma.DbNull
        : (input.benefits as unknown as Prisma.InputJsonValue);
  const updated = await prisma.challenge.update({
    where: { id: input.challengeId },
    data: {
      ...("autoStartAfterHours" in input ? { autoStartAfterHours: input.autoStartAfterHours ?? null } : {}),
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.freezeFromDay !== undefined ? { freezeFromDay: input.freezeFromDay } : {}),
      ...(input.freezeStartsAt !== undefined
        ? { freezeStartsAt: input.freezeStartsAt ? new Date(input.freezeStartsAt) : null }
        : {}),
      ...(input.freezeEndsAt !== undefined
        ? { freezeEndsAt: input.freezeEndsAt ? new Date(input.freezeEndsAt) : null }
        : {}),
      ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl?.trim() || null } : {}),
      ...(input.bannerMediaType !== undefined ? { bannerMediaType: input.bannerMediaType } : {}),
      ...(input.bannerVideoUrl !== undefined ? { bannerVideoUrl: input.bannerVideoUrl?.trim() || null } : {}),
      ...(input.featuredOnGlobal !== undefined ? { featuredOnGlobal: input.featuredOnGlobal } : {}),
      ...(input.requiredTier !== undefined ? { requiredTier: input.requiredTier?.trim() || null } : {}),
      ...("pricingConfig" in input
        ? { pricingConfig: input.pricingConfig === null ? Prisma.DbNull : (input.pricingConfig as Prisma.InputJsonValue) }
        : {}),
      ...(input.taskUnlockMode !== undefined ? { taskUnlockMode: input.taskUnlockMode } : {}),
      ...(input.unlockIntervalHours !== undefined ? { unlockIntervalHours: input.unlockIntervalHours } : {}),
      ...("freezeWindows" in input
        ? { freezeWindows: input.freezeWindows === null ? Prisma.DbNull : (input.freezeWindows as Prisma.InputJsonValue) }
        : {}),
      ...(input.pitch !== undefined ? { pitch: input.pitch } : {}),
      ...(benefitsValue !== undefined ? { benefits: benefitsValue } : {}),
      ...(input.bumpProductId !== undefined ? { bumpProductId: input.bumpProductId } : {}),
      ...(input.aiReviewEnabled !== undefined ? { aiReviewEnabled: input.aiReviewEnabled } : {}),
      ...(input.aiReviewThreshold !== undefined ? { aiReviewThreshold: input.aiReviewThreshold } : {}),
      ...(input.aiReviewFallback !== undefined ? { aiReviewFallback: input.aiReviewFallback } : {}),
      ...(input.aiReviewProvider !== undefined ? { aiReviewProvider: input.aiReviewProvider } : {}),
      ...(input.aiReviewProviderId !== undefined ? { aiReviewProviderId: input.aiReviewProviderId } : {}),
      ...(input.aiReviewModel !== undefined ? { aiReviewModel: input.aiReviewModel } : {}),
      lastEditedBy: actorId,
      lastEditedByType: actorType,
      lastEditedAt: new Date(),
    },
  });
  await deleteReplacedMediaUrl(ch.bannerUrl, updated.bannerUrl, {
    challengeId: input.challengeId,
    field: "bannerUrl",
  });
  logger.info(
    { challengeId: input.challengeId, by: input.userId },
    "[challenge] settings updated"
  );
  return ch;
}

export async function startChallengeForMember(input: {
  userId: string;
  challengeId: string;
}) {
  const member = await prisma.challengeMember.findUnique({
    where: { challengeId_userId: { challengeId: input.challengeId, userId: input.userId } },
    select: {
      status: true,
      personalStartsAt: true,
      challenge: { select: { taskUnlockMode: true } },
    },
  });
  if (!member || member.status !== "ACTIVE" || member.personalStartsAt) {
    throw new Error("invalid_state");
  }
  if (!canStartChallengeNow(member.challenge.taskUnlockMode)) {
    throw new Error("challenge_start_window_closed");
  }
  await prisma.challengeMember.update({
    where: { challengeId_userId: { challengeId: input.challengeId, userId: input.userId } },
    data: { personalStartsAt: new Date() },
  });
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
  maxEvidenceImages?: number;
  label?: string;
  unlockAfterHours?: number | null;
  aiReviewGuidelines?: string | null;
  aiReviewRedFlags?: string | null;
  giftLabel?: string;
  giftFileUrl?: string;
  giftLinkUrl?: string;
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
      ...("maxEvidenceImages" in input ? { maxEvidenceImages: input.maxEvidenceImages ?? 3 } : {}),
      ...(input.label !== undefined ? { label: input.label || null } : {}),
      ...("unlockAfterHours" in input ? { unlockAfterHours: input.unlockAfterHours ?? null } : {}),
      ...(input.aiReviewGuidelines !== undefined ? { aiReviewGuidelines: input.aiReviewGuidelines } : {}),
      ...(input.aiReviewRedFlags !== undefined ? { aiReviewRedFlags: input.aiReviewRedFlags } : {}),
      ...(input.giftLabel !== undefined ? { giftLabel: input.giftLabel || null } : {}),
      ...(input.giftFileUrl !== undefined ? { giftFileUrl: input.giftFileUrl || null } : {}),
      ...(input.giftLinkUrl !== undefined ? { giftLinkUrl: input.giftLinkUrl || null } : {}),
    },
  });
  logger.info(
    { taskId: input.taskId, by: input.userId },
    "[challenge] task updated"
  );
  return updated;
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
  maxEvidenceImages?: number;
  label?: string;
  unlockAfterHours?: number | null;
}) {
  await assertChallengeAdmin(input.userId, input.challengeId);
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
      maxEvidenceImages: input.maxEvidenceImages ?? 3,
      label: input.label?.trim() || null,
      unlockAfterHours: input.unlockAfterHours ?? null,
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

/**
 * Join a challenge. Always lands ACTIVE — the previous admin-approval gate is gone.
 * personalStartsAt stays null; member presses "Bắt đầu" or waits for grace.
 */
export async function joinChallenge(input: {
  userId: string;
  challengeId: string;
}): Promise<{ status: "ACTIVE" }> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: input.challengeId },
    select: { communityId: true },
  });
  if (!challenge) throw new Error("Challenge không tồn tại");
  await assertCommunityCanWrite(challenge.communityId);

  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: challenge.communityId,
      },
    },
    select: { id: true },
  });
  if (!membership) throw new Error("not_a_member");

  await prisma.challengeMember.upsert({
    where: {
      challengeId_userId: {
        userId: input.userId,
        challengeId: input.challengeId,
      },
    },
    update: {},
    create: {
      userId: input.userId,
      challengeId: input.challengeId,
      status: "ACTIVE",
    },
  });
  logger.info(
    { userId: input.userId, challengeId: input.challengeId },
    "[challenge] member joined"
  );
  return { status: "ACTIVE" };
}
