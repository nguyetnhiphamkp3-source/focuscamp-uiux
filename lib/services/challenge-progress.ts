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
 * Day-anchor (Option B): the local-midnight at which "Day 1" officially begins.
 *
 * Rounds the personal start UP to the next local midnight. The remainder of the
 * day a member presses "Bắt đầu" is warm-up — Day-1's task is already visible and
 * can be checked in early, but the day counter and missed-day tally only start
 * ticking at this anchor. So an evening starter isn't shortchanged on Day 1 (and
 * is never flagged "missed" for the partial first day). Starting exactly at
 * midnight keeps that midnight as Day 1 (no push).
 */
export function challengeDayAnchor(effStart: Date): Date {
  const anchor = new Date(effStart);
  anchor.setHours(0, 0, 0, 0);
  if (effStart.getTime() > anchor.getTime()) {
    anchor.setDate(anchor.getDate() + 1);
  }
  return anchor;
}

/**
 * Current 1-based day number for a member, per Option B (see challengeDayAnchor).
 * During warm-up (before the anchor) this clamps to 1, so Day-1's task shows but
 * no earlier day is ever counted as missed.
 */
export function challengeCurrentDay(
  effStart: Date,
  requiredDays: number,
  now: Date = new Date()
): number {
  const anchor = challengeDayAnchor(effStart);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const elapsedDays = Math.floor(
    (today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(requiredDays, Math.max(1, elapsedDays + 1));
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

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const currentDay = challengeCurrentDay(effStart, ch.requiredDays, now);
  const progressPct = Math.round((currentDay / ch.requiredDays) * 100);

  const todayTask = ch.tasks.find((t) => t.dayNumber === currentDay) || null;

  // Load all my check-ins for this challenge (lightweight)
  const myCheckins = await prisma.checkin.findMany({
    where: { userId, challengeId: ch.id },
    select: { dayNumber: true, createdAt: true, status: true },
  });
  const dayNumbers = myCheckins
    .map((c) => c.dayNumber ?? null)
    .filter((n): n is number => n !== null);
  // "Done for now" if submitted since local midnight (normal daily flow) OR the
  // current day already has a non-rejected submission. The 2nd clause matters in
  // warm-up: Day 1 spans the start evening + the anchor day (2 calendar dates),
  // so a midnight-only check would re-show the form and allow a duplicate Day-1.
  const checkedInToday =
    myCheckins.some((c) => c.createdAt.getTime() >= today.getTime()) ||
    myCheckins.some((c) => c.dayNumber === currentDay && c.status !== "REJECTED");
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
  imageUrls?: string[];
}) {
  const { userId, challengeId, content, taskId, dayNumber, linkUrl, imageUrls } =
    params;
  const normalizedContent = content.trim();

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

  const task = taskId
    ? await prisma.challengeTask.findFirst({
        where: { id: taskId, challengeId },
        select: { evidenceType: true, aiReviewGuidelines: true },
      })
    : null;
  const evidenceType = task?.evidenceType ?? "TEXT";
  const hasText = normalizedContent.length >= 5;
  const hasPartialText =
    normalizedContent.length > 0 && normalizedContent.length < 5;
  const hasLink = !!linkUrl?.trim();
  const hasImage = (imageUrls?.length ?? 0) > 0;

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

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { autoStartAfterHours: true },
  });
  if (!challenge) throw new Error("challenge_not_found");

  const effStart = effectivePersonalStartsAt(member, challenge);
  if (!effStart) throw new Error("challenge_not_started");

  // Every submission lands as PENDING — completion is granted only when a reviewer
  // (AI or admin) approves it (see reviewSubmission in challenge-member.ts). Applies
  // to all unlock modes; nothing auto-completes on submit.
  let checkinId = "";
  await prisma.$transaction(async (tx) => {
    const created = await tx.checkin.create({
      data: {
        userId,
        challengeId,
        content: normalizedContent || "Đã upload ảnh bằng chứng",
        taskId: taskId ?? null,
        dayNumber: dayNumber ?? null,
        linkUrl: linkUrl ?? null,
        imageUrls: imageUrls ?? [],
        status: "PENDING",
      },
    });
    checkinId = created.id;
    await tx.challengeMember.update({
      where: { id: member.id },
      data: {
        lastCheckinAt: new Date(),
        consecutiveMissed: 0,
      },
    });
  });

  logger.info(
    { userId, challengeId },
    "[challenge] checkin submitted (pending review)"
  );

  // Bump streak first, then award XP (multiplier uses the freshly bumped streak)
  const challengeCommunity = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      communityId: true,
      title: true,
      slug: true,
      community: { select: { slug: true } },
    },
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
    // External notification — fire-and-forget
    void (async () => {
      try {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        const displayName = u?.name || u?.email?.split("@")[0] || "Thành viên";
        const { dispatchToChannels } = await import("./external-notify");
        await dispatchToChannels(challengeCommunity.communityId, "checkin_submitted", {
          title: `✅ ${displayName} vừa check-in`,
          description: `${challengeCommunity.title}${dayNumber ? ` · Ngày ${dayNumber}` : ""}`,
          url: `/c/${challengeCommunity.community.slug}/challenges/${challengeCommunity.slug}`,
        }, {
          name: displayName,
          challenge: challengeCommunity.title,
          day: String(dayNumber ?? ""),
        }, { challengeId });
      } catch { /* non-blocking */ }
    })();
  }

  return { ok: true, checkinId };
}
