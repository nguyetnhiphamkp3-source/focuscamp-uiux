import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { checkinImages } from "@/lib/checkin-images";
import {
  challengeCurrentDay,
  challengeDayAnchor,
  effectivePersonalStartsAt,
  hasCalendarDeadline,
  sequentialCurrentDay,
} from "@/lib/services/challenge-progress";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ChallengeProgressTimelineState =
  | "APPROVED_ON_TIME"
  | "APPROVED_LATE"
  | "PENDING"
  | "REJECTED"
  | "MISSING"
  | "CURRENT"
  | "LOCKED";

export type ChallengeMemberProgressCheckin = {
  id: string;
  content: string;
  linkUrl: string | null;
  imageUrls: string[];
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: { id: string; name: string | null } | null;
  rejectCount: number;
  reviewHistory: unknown;
  createdAt: Date;
  resubmittedAt: Date | null;
  submittedAt: Date;
};

export type ChallengeMemberProgressTask = {
  taskId: string;
  dayNumber: number;
  label: string | null;
  title: string;
  state: ChallengeProgressTimelineState;
  deadlineAt: Date | null;
  isLate: boolean;
  checkin: ChallengeMemberProgressCheckin | null;
};

export type ChallengeMemberProgressRow = {
  memberId: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    handle: string | null;
  };
  memberStatus: string;
  currentDay: number;
  currentTaskTitle: string | null;
  totalTasks: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  lateCount: number;
  missingCount: number;
  latestSubmissionAt: Date | null;
  latestSubmissionStatus: string | null;
};

export type ChallengeMemberProgressDetail = ChallengeMemberProgressRow & {
  joinedAt: Date;
  personalStartsAt: Date | null;
  effectiveStartsAt: Date | null;
  completedAt: Date | null;
  tasks: ChallengeMemberProgressTask[];
};

type ChallengeForProgress = {
  requiredDays: number;
  autoStartAfterHours: number | null;
  taskUnlockMode: string | null;
  unlockIntervalHours: number | null;
};

type TaskForProgress = {
  id: string;
  dayNumber: number;
  label: string | null;
  title: string;
  unlockAfterHours: number | null;
};

type MemberForProgress = {
  id: string;
  userId: string;
  status: string;
  joinedAt: Date;
  personalStartsAt: Date | null;
  completedAt: Date | null;
  user: ChallengeMemberProgressRow["user"];
};

type CheckinForProgress = {
  id: string;
  userId: string;
  dayNumber: number | null;
  content: string;
  linkUrl: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: { id: string; name: string | null } | null;
  rejectCount: number;
  reviewHistory: unknown;
  createdAt: Date;
  resubmittedAt: Date | null;
};

export function buildChallengeMemberProgress(input: {
  challenge: ChallengeForProgress;
  tasks: TaskForProgress[];
  members: MemberForProgress[];
  checkins: CheckinForProgress[];
  now?: Date;
}): ChallengeMemberProgressDetail[] {
  const now = input.now ?? new Date();
  const tasks = [...input.tasks].sort((a, b) => a.dayNumber - b.dayNumber);
  const checkinsByUser = groupCheckinsByUser(input.checkins);

  return input.members.map((member) =>
    buildMemberProgress({
      challenge: input.challenge,
      tasks,
      member,
      checkins: checkinsByUser.get(member.userId) ?? [],
      now,
    }),
  );
}

export async function listChallengeMemberProgress(input: {
  challengeId: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: ChallengeMemberProgressRow[]; total: number }> {
  const { details, total } = await getChallengeProgressDetails({
    challengeId: input.challengeId,
    search: input.search,
    limit: input.limit,
    offset: input.offset,
  });
  return {
    rows: details.map(({ tasks: _tasks, ...row }) => row),
    total,
  };
}

export async function getChallengeMemberProgress(input: {
  challengeId: string;
  userId: string;
}): Promise<ChallengeMemberProgressDetail | null> {
  const { details } = await getChallengeProgressDetails({
    challengeId: input.challengeId,
    userId: input.userId,
  });
  return details[0] ?? null;
}

async function getChallengeProgressDetails(input: {
  challengeId: string;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ details: ChallengeMemberProgressDetail[]; total: number }> {
  const memberWhere = challengeMemberWhere(input);
  const challenge = await prisma.challenge.findUnique({
    where: { id: input.challengeId },
    select: {
      requiredDays: true,
      autoStartAfterHours: true,
      taskUnlockMode: true,
      unlockIntervalHours: true,
      tasks: {
        orderBy: { dayNumber: "asc" },
        select: {
          id: true,
          dayNumber: true,
          label: true,
          title: true,
          unlockAfterHours: true,
        },
      },
    },
  });
  if (!challenge) return { details: [], total: 0 };

  const [members, total] = await Promise.all([
    prisma.challengeMember.findMany({
      where: memberWhere,
      orderBy: { joinedAt: "asc" },
      ...(input.limit ? { take: input.limit } : {}),
      ...(input.offset ? { skip: input.offset } : {}),
      select: {
        id: true,
        userId: true,
        status: true,
        joinedAt: true,
        personalStartsAt: true,
        completedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            handle: true,
          },
        },
      },
    }),
    prisma.challengeMember.count({ where: memberWhere }),
  ]);
  if (members.length === 0) return { details: [], total };

  const userIds = members.map((m) => m.userId);
  const checkins = await prisma.checkin.findMany({
    where: {
      challengeId: input.challengeId,
      userId: { in: userIds },
      dayNumber: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      dayNumber: true,
      content: true,
      linkUrl: true,
      imageUrl: true,
      imageUrls: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      reviewedBy: { select: { id: true, name: true } },
      rejectCount: true,
      reviewHistory: true,
      createdAt: true,
      resubmittedAt: true,
    },
  });

  return {
    details: buildChallengeMemberProgress({
      challenge,
      tasks: challenge.tasks,
      members,
      checkins,
    }),
    total,
  };
}

function challengeMemberWhere(input: {
  challengeId: string;
  userId?: string;
  search?: string;
}): Prisma.ChallengeMemberWhereInput {
  const search = input.search?.trim();
  return {
    challengeId: input.challengeId,
    status: { in: ["ACTIVE", "COMPLETED"] },
    ...(input.userId ? { userId: input.userId } : {}),
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { user: { handle: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

function buildMemberProgress(input: {
  challenge: ChallengeForProgress;
  tasks: TaskForProgress[];
  member: MemberForProgress;
  checkins: CheckinForProgress[];
  now: Date;
}): ChallengeMemberProgressDetail {
  const unlockMode = input.challenge.taskUnlockMode ?? "DAILY";
  const calendarDeadline = hasCalendarDeadline(unlockMode);
  const effectiveStartsAt = effectivePersonalStartsAt(
    input.member,
    input.challenge,
    input.now,
  );
  const checkinByDay = selectCurrentCheckinByDay(input.checkins);
  const nonRejectedDayNumbers = new Set(
    [...checkinByDay.values()]
      .filter((c) => c.status !== "REJECTED")
      .map((c) => c.dayNumber)
      .filter((day): day is number => day !== null),
  );
  const approvedDayNumbers = new Set(
    [...checkinByDay.values()]
      .filter((c) => c.status === "APPROVED")
      .map((c) => c.dayNumber)
      .filter((day): day is number => day !== null),
  );
  const currentDay = currentDayForMember({
    challenge: input.challenge,
    tasks: input.tasks,
    member: input.member,
    effectiveStartsAt,
    approvedDayNumbers,
    now: input.now,
    unlockMode,
  });

  const tasks = input.tasks.map((task, index) => {
    const checkin = checkinByDay.get(task.dayNumber) ?? null;
    const deadlineAt =
      calendarDeadline && effectiveStartsAt
        ? new Date(challengeDayAnchor(effectiveStartsAt).getTime() + task.dayNumber * DAY_MS)
        : null;
    const isLate =
      !!deadlineAt &&
      checkin?.status === "APPROVED" &&
      submittedAt(checkin).getTime() > deadlineAt.getTime();
    const unlocked = isTaskUnlocked({
      challenge: input.challenge,
      tasks: input.tasks,
      taskIndex: index,
      member: input.member,
      effectiveStartsAt,
      currentDay,
      approvedDayNumbers,
      nonRejectedDayNumbers,
      now: input.now,
      unlockMode,
    });

    return {
      taskId: task.id,
      dayNumber: task.dayNumber,
      label: task.label,
      title: task.title,
      state: timelineState({
        checkin,
        isLate,
        unlocked,
        currentDay,
        dayNumber: task.dayNumber,
        calendarDeadline,
      }),
      deadlineAt,
      isLate,
      checkin: checkin ? toProgressCheckin(checkin) : null,
    };
  });

  const latest = latestCheckin(input.checkins);
  const currentTask =
    input.tasks.find((task) => task.dayNumber === currentDay) ??
    tasks.find((task) => task.state === "CURRENT") ??
    null;
  const approvedCount = tasks.filter(
    (task) => task.state === "APPROVED_ON_TIME" || task.state === "APPROVED_LATE",
  ).length;

  return {
    memberId: input.member.id,
    userId: input.member.userId,
    user: input.member.user,
    memberStatus: input.member.status,
    joinedAt: input.member.joinedAt,
    personalStartsAt: input.member.personalStartsAt,
    effectiveStartsAt,
    completedAt: input.member.completedAt,
    currentDay,
    currentTaskTitle: currentTask?.title ?? null,
    totalTasks: input.tasks.length,
    approvedCount,
    pendingCount: tasks.filter((task) => task.state === "PENDING").length,
    rejectedCount: tasks.filter((task) => task.state === "REJECTED").length,
    lateCount: tasks.filter((task) => task.state === "APPROVED_LATE").length,
    missingCount: tasks.filter((task) => task.state === "MISSING").length,
    latestSubmissionAt: latest ? submittedAt(latest) : null,
    latestSubmissionStatus: latest?.status ?? null,
    tasks,
  };
}

function currentDayForMember(input: {
  challenge: ChallengeForProgress;
  tasks: TaskForProgress[];
  member: MemberForProgress;
  effectiveStartsAt: Date | null;
  approvedDayNumbers: Set<number>;
  now: Date;
  unlockMode: string;
}): number {
  if (input.member.completedAt || input.member.status === "COMPLETED") {
    return input.challenge.requiredDays;
  }
  if (!input.effectiveStartsAt) return 0;
  if (input.unlockMode === "SEQUENTIAL") {
    return sequentialCurrentDay(
      input.tasks,
      input.approvedDayNumbers,
      input.challenge.requiredDays,
    );
  }
  return challengeCurrentDay(
    input.effectiveStartsAt,
    input.challenge.requiredDays,
    input.now,
  );
}

function isTaskUnlocked(input: {
  challenge: ChallengeForProgress;
  tasks: TaskForProgress[];
  taskIndex: number;
  member: MemberForProgress;
  effectiveStartsAt: Date | null;
  currentDay: number;
  approvedDayNumbers: Set<number>;
  nonRejectedDayNumbers: Set<number>;
  now: Date;
  unlockMode: string;
}): boolean {
  if (!input.effectiveStartsAt) return false;
  if (input.member.completedAt || input.member.status === "COMPLETED") return true;
  const task = input.tasks[input.taskIndex];
  const prevTask = input.tasks[input.taskIndex - 1];

  switch (input.unlockMode) {
    case "ALL":
      return true;
    case "DAILY":
      return isTimeGateOpen(input);
    case "SEQUENTIAL":
      return input.taskIndex === 0 || input.approvedDayNumbers.has(prevTask.dayNumber);
    case "DAILY_SEQUENTIAL":
      return (
        isTimeGateOpen(input) &&
        (input.taskIndex === 0 || input.nonRejectedDayNumbers.has(prevTask.dayNumber))
      );
    case "MANUAL":
      return input.taskIndex === 0 || task.unlockAfterHours === 0;
    default:
      return true;
  }
}

function isTimeGateOpen(input: {
  challenge: ChallengeForProgress;
  tasks: TaskForProgress[];
  taskIndex: number;
  effectiveStartsAt: Date | null;
  currentDay: number;
  now: Date;
}): boolean {
  if (!input.effectiveStartsAt) return false;
  const defaultInterval = input.challenge.unlockIntervalHours ?? 24;
  let cumulativeHours = 0;
  for (let i = 0; i < input.taskIndex; i++) {
    cumulativeHours += input.tasks[i].unlockAfterHours ?? defaultInterval;
  }
  const unlockAfterDays = cumulativeHours / 24;
  if (Number.isInteger(unlockAfterDays)) {
    return input.currentDay > unlockAfterDays;
  }
  return input.now.getTime() >= input.effectiveStartsAt.getTime() + cumulativeHours * 60 * 60 * 1000;
}

function timelineState(input: {
  checkin: CheckinForProgress | null;
  isLate: boolean;
  unlocked: boolean;
  currentDay: number;
  dayNumber: number;
  calendarDeadline: boolean;
}): ChallengeProgressTimelineState {
  if (input.checkin?.status === "APPROVED") {
    return input.isLate ? "APPROVED_LATE" : "APPROVED_ON_TIME";
  }
  if (input.checkin?.status === "PENDING") return "PENDING";
  if (input.checkin?.status === "REJECTED") return "REJECTED";
  if (!input.unlocked) return "LOCKED";
  if (input.calendarDeadline && input.dayNumber < input.currentDay) return "MISSING";
  return "CURRENT";
}

function groupCheckinsByUser(checkins: CheckinForProgress[]) {
  const byUser = new Map<string, CheckinForProgress[]>();
  for (const checkin of checkins) {
    const rows = byUser.get(checkin.userId) ?? [];
    rows.push(checkin);
    byUser.set(checkin.userId, rows);
  }
  return byUser;
}

function selectCurrentCheckinByDay(checkins: CheckinForProgress[]) {
  const byDay = new Map<number, CheckinForProgress[]>();
  for (const checkin of checkins) {
    if (checkin.dayNumber == null) continue;
    const rows = byDay.get(checkin.dayNumber) ?? [];
    rows.push(checkin);
    byDay.set(checkin.dayNumber, rows);
  }

  const selected = new Map<number, CheckinForProgress>();
  for (const [dayNumber, rows] of byDay) {
    const sorted = [...rows].sort(
      (a, b) => submittedAt(b).getTime() - submittedAt(a).getTime(),
    );
    selected.set(
      dayNumber,
      sorted.find((row) => row.status !== "REJECTED") ?? sorted[0],
    );
  }
  return selected;
}

function latestCheckin(checkins: CheckinForProgress[]) {
  return [...checkins].sort(
    (a, b) => submittedAt(b).getTime() - submittedAt(a).getTime(),
  )[0] ?? null;
}

function submittedAt(checkin: CheckinForProgress): Date {
  return checkin.resubmittedAt ?? checkin.createdAt;
}

function toProgressCheckin(
  checkin: CheckinForProgress,
): ChallengeMemberProgressCheckin {
  return {
    id: checkin.id,
    content: checkin.content,
    linkUrl: checkin.linkUrl,
    imageUrls: checkinImages(checkin),
    status: checkin.status,
    reviewNote: checkin.reviewNote,
    reviewedAt: checkin.reviewedAt,
    reviewedBy: checkin.reviewedBy,
    rejectCount: checkin.rejectCount,
    reviewHistory: checkin.reviewHistory,
    createdAt: checkin.createdAt,
    resubmittedAt: checkin.resubmittedAt,
    submittedAt: submittedAt(checkin),
  };
}
