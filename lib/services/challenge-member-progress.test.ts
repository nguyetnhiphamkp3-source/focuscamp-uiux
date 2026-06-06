import test from "node:test";
import assert from "node:assert/strict";
import { buildChallengeMemberProgress } from "@/lib/services/challenge-member-progress";
import { communityPermissionFlags } from "@/lib/community-permissions";

const baseChallenge = {
  requiredDays: 5,
  autoStartAfterHours: null,
  taskUnlockMode: "DAILY",
  unlockIntervalHours: 24,
};

const tasks = [1, 2, 3, 4, 5].map((dayNumber) => ({
  id: `task-${dayNumber}`,
  dayNumber,
  label: null,
  title: `Task ${dayNumber}`,
  unlockAfterHours: null,
}));

const member = {
  id: "member-1",
  userId: "user-1",
  status: "ACTIVE",
  joinedAt: new Date(2026, 0, 1, 9),
  personalStartsAt: new Date(2026, 0, 1, 9),
  completedAt: null,
  user: {
    id: "user-1",
    name: "Lan Nguyen",
    email: "lan@example.com",
    image: null,
    handle: "lan",
  },
};

function checkin(input: {
  id: string;
  dayNumber: number;
  status: string;
  createdAt: Date;
  resubmittedAt?: Date | null;
}) {
  return {
    id: input.id,
    userId: "user-1",
    dayNumber: input.dayNumber,
    content: "Evidence",
    linkUrl: null,
    imageUrl: null,
    imageUrls: [],
    status: input.status,
    reviewNote: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectCount: 0,
    reviewHistory: null,
    createdAt: input.createdAt,
    resubmittedAt: input.resubmittedAt ?? null,
  };
}

test("daily progress computes current day and missing only for past unlocked days", () => {
  const [progress] = buildChallengeMemberProgress({
    challenge: baseChallenge,
    tasks,
    members: [member],
    checkins: [
      checkin({
        id: "day-1",
        dayNumber: 1,
        status: "APPROVED",
        createdAt: new Date(2026, 0, 2, 12),
      }),
    ],
    now: new Date(2026, 0, 4, 9),
  });

  assert.equal(progress.currentDay, 3);
  assert.equal(progress.missingCount, 1);
  assert.equal(progress.tasks[1].state, "MISSING");
  assert.equal(progress.tasks[2].state, "CURRENT");
  assert.equal(progress.tasks[3].state, "LOCKED");
});

test("approved late is derived from submission time versus calendar deadline", () => {
  const [progress] = buildChallengeMemberProgress({
    challenge: baseChallenge,
    tasks,
    members: [member],
    checkins: [
      checkin({
        id: "day-1",
        dayNumber: 1,
        status: "APPROVED",
        createdAt: new Date(2026, 0, 2, 12),
      }),
      checkin({
        id: "day-2",
        dayNumber: 2,
        status: "APPROVED",
        createdAt: new Date(2026, 0, 5, 12),
      }),
    ],
    now: new Date(2026, 0, 6, 9),
  });

  assert.equal(progress.approvedCount, 2);
  assert.equal(progress.lateCount, 1);
  assert.equal(progress.tasks[0].state, "APPROVED_ON_TIME");
  assert.equal(progress.tasks[1].state, "APPROVED_LATE");
});

test("pending and rejected submissions do not count as approved", () => {
  const [progress] = buildChallengeMemberProgress({
    challenge: baseChallenge,
    tasks,
    members: [member],
    checkins: [
      checkin({
        id: "day-1",
        dayNumber: 1,
        status: "PENDING",
        createdAt: new Date(2026, 0, 2, 12),
      }),
      checkin({
        id: "day-2",
        dayNumber: 2,
        status: "REJECTED",
        createdAt: new Date(2026, 0, 3, 12),
      }),
    ],
    now: new Date(2026, 0, 4, 9),
  });

  assert.equal(progress.approvedCount, 0);
  assert.equal(progress.pendingCount, 1);
  assert.equal(progress.rejectedCount, 1);
  assert.equal(progress.tasks[0].state, "PENDING");
  assert.equal(progress.tasks[1].state, "REJECTED");
});

test("latest non-rejected check-in per day is the task row", () => {
  const [progress] = buildChallengeMemberProgress({
    challenge: baseChallenge,
    tasks,
    members: [member],
    checkins: [
      checkin({
        id: "approved-old",
        dayNumber: 1,
        status: "APPROVED",
        createdAt: new Date(2026, 0, 2, 12),
      }),
      checkin({
        id: "rejected-new",
        dayNumber: 1,
        status: "REJECTED",
        createdAt: new Date(2026, 0, 4, 12),
      }),
    ],
    now: new Date(2026, 0, 5, 9),
  });

  assert.equal(progress.tasks[0].checkin?.id, "approved-old");
  assert.equal(progress.tasks[0].state, "APPROVED_ON_TIME");
  assert.equal(progress.latestSubmissionStatus, "REJECTED");
});

test("sequential mode uses approved tasks to determine current task", () => {
  const [progress] = buildChallengeMemberProgress({
    challenge: { ...baseChallenge, taskUnlockMode: "SEQUENTIAL" },
    tasks,
    members: [member],
    checkins: [
      checkin({
        id: "day-1",
        dayNumber: 1,
        status: "APPROVED",
        createdAt: new Date(2026, 0, 2, 12),
      }),
      checkin({
        id: "day-2",
        dayNumber: 2,
        status: "PENDING",
        createdAt: new Date(2026, 0, 2, 13),
      }),
    ],
    now: new Date(2026, 0, 5, 9),
  });

  assert.equal(progress.currentDay, 2);
  assert.equal(progress.tasks[1].state, "PENDING");
  assert.equal(progress.tasks[2].state, "LOCKED");
});

test("review submission permission gates the inspector roles", () => {
  assert.equal(communityPermissionFlags("OWNER").canReviewSubmissions, true);
  assert.equal(communityPermissionFlags("ADMIN").canReviewSubmissions, true);
  assert.equal(communityPermissionFlags("MOD").canReviewSubmissions, true);
  assert.equal(communityPermissionFlags("MEMBER").canReviewSubmissions, false);
});
