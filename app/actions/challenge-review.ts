"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  reviewSubmission,
  flagSubmissionForReview,
  approveAllPending,
  approveChallengeMember,
  rejectChallengeMember,
  updateChallengeSettings,
  updateChallengeTask,
  toggleCheckinVote,
  createChallenge,
  createChallengeTask,
  deleteChallengeTask,
  joinChallenge,
} from "@/lib/services/challenge";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  ReviewSubmissionSchema,
  FlagSubmissionSchema,
  ApproveAllPendingSchema,
  UpdateChallengeSettingsSchema,
  UpdateChallengeTaskSchema,
  CreateChallengeSchema,
  CreateChallengeTaskSchema,
  DeleteChallengeTaskSchema,
} from "@/lib/validations";
import { z } from "zod";
import { logError } from "@/lib/logger";

type ActionResult = { ok: true } | { ok: false; reason: string };

function bumpChallenge(communitySlug: string, challengeSlug: string) {
  revalidatePath(`/c/${communitySlug}/challenges/${challengeSlug}`);
  revalidatePath(`/c/${communitySlug}/challenges`);
  revalidatePath(`/c/${communitySlug}/leaderboard`);
}

export async function reviewSubmissionAction(input: {
  checkinId: string;
  action: "APPROVE" | "REJECT";
  note?: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = ReviewSubmissionSchema.safeParse({
    checkinId: input.checkinId,
    action: input.action,
    note: input.note,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await reviewSubmission({
      userId: s.user.id,
      checkinId: parsed.data.checkinId,
      action: parsed.data.action,
      note: parsed.data.note || undefined,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, checkinId: input.checkinId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function flagSubmissionAction(input: {
  checkinId: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = FlagSubmissionSchema.safeParse({ checkinId: input.checkinId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    await flagSubmissionForReview({
      userId: s.user.id,
      checkinId: parsed.data.checkinId,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, checkinId: input.checkinId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function approveAllPendingAction(input: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult & { count?: number }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = ApproveAllPendingSchema.safeParse({
    challengeId: input.challengeId,
  });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const res = await approveAllPending({
      userId: s.user.id,
      challengeId: parsed.data.challengeId,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true, count: res.count };
  } catch (err) {
    logError(err, { userId: s.user.id, challengeId: input.challengeId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

const MemberIdSchema = z.object({ memberId: z.string().cuid() });
const RejectMemberSchema = MemberIdSchema.extend({
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function approveMemberAction(input: {
  memberId: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = MemberIdSchema.safeParse({ memberId: input.memberId });
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    await approveChallengeMember({ userId: s.user.id, memberId: parsed.data.memberId });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, memberId: input.memberId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function rejectMemberAction(input: {
  memberId: string;
  note?: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = RejectMemberSchema.safeParse({
    memberId: input.memberId,
    note: input.note,
  });
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    await rejectChallengeMember({
      userId: s.user.id,
      memberId: parsed.data.memberId,
      note: parsed.data.note || undefined,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, memberId: input.memberId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateChallengeSettingsAction(input: {
  challengeId: string;
  requiresApproval?: boolean;
  title?: string;
  description?: string;
  freezeFromDay?: number | null;
  freezeStartsAt?: string | null;
  freezeEndsAt?: string | null;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = UpdateChallengeSettingsSchema.safeParse({
    challengeId: input.challengeId,
    requiresApproval: input.requiresApproval,
    title: input.title,
    description: input.description,
    freezeFromDay: input.freezeFromDay,
    freezeStartsAt: input.freezeStartsAt,
    freezeEndsAt: input.freezeEndsAt,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }
  try {
    await updateChallengeSettings({
      userId: s.user.id,
      challengeId: parsed.data.challengeId,
      requiresApproval: parsed.data.requiresApproval,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      freezeFromDay: parsed.data.freezeFromDay ?? undefined,
      freezeStartsAt: parsed.data.freezeStartsAt || null,
      freezeEndsAt: parsed.data.freezeEndsAt || null,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, challengeId: input.challengeId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateTaskAction(input: {
  taskId: string;
  title?: string;
  description?: string;
  sopContent?: string;
  videoUrl?: string;
  evidenceType?: "TEXT" | "LINK" | "IMAGE" | "FILE";
  evidenceLabel?: string;
  label?: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = UpdateChallengeTaskSchema.safeParse({
    taskId: input.taskId,
    title: input.title,
    description: input.description,
    sopContent: input.sopContent,
    videoUrl: input.videoUrl,
    evidenceType: input.evidenceType,
    evidenceLabel: input.evidenceLabel,
    label: input.label,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }
  try {
    await updateChallengeTask({
      userId: s.user.id,
      taskId: parsed.data.taskId,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      sopContent: parsed.data.sopContent ?? undefined,
      videoUrl: parsed.data.videoUrl ?? undefined,
      evidenceType: parsed.data.evidenceType,
      evidenceLabel: parsed.data.evidenceLabel ?? undefined,
      label: parsed.data.label ?? undefined,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, taskId: input.taskId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

const VoteSchema = z.object({ checkinId: z.string().cuid() });

export async function toggleCheckinVoteAction(input: {
  checkinId: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<
  | { ok: true; data: { voted: boolean; count: number } }
  | { ok: false; reason: string }
> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = VoteSchema.safeParse({ checkinId: input.checkinId });
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    const res = await toggleCheckinVote({
      userId: s.user.id,
      checkinId: parsed.data.checkinId,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true, data: res };
  } catch (err) {
    logError(err, { userId: s.user.id, checkinId: input.checkinId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function createChallengeAction(input: {
  communityId: string;
  communitySlug: string;
  slug: string;
  title: string;
  description?: string;
  difficulty?: "NORMAL" | "HARD" | "CHAOS";
  requiredDays?: number;
  requiresApproval?: boolean;
}): Promise<
  | { ok: true; slug: string }
  | { ok: false; reason: string }
> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = CreateChallengeSchema.safeParse({
    communityId: input.communityId,
    slug: input.slug,
    title: input.title,
    description: input.description,
    difficulty: input.difficulty,
    requiredDays: input.requiredDays,
    requiresApproval: input.requiresApproval,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }
  try {
    const ch = await createChallenge({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      difficulty: parsed.data.difficulty,
      requiredDays: parsed.data.requiredDays,
      requiresApproval: parsed.data.requiresApproval,
    });
    revalidatePath(`/c/${input.communitySlug}/challenges`);
    return { ok: true, slug: ch.slug };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function createTaskAction(input: {
  challengeId: string;
  dayNumber: number;
  title: string;
  description?: string;
  sopContent?: string;
  videoUrl?: string;
  evidenceType?: "TEXT" | "LINK" | "IMAGE" | "FILE";
  evidenceLabel?: string;
  label?: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = CreateChallengeTaskSchema.safeParse({
    challengeId: input.challengeId,
    dayNumber: input.dayNumber,
    title: input.title,
    description: input.description,
    sopContent: input.sopContent,
    videoUrl: input.videoUrl,
    evidenceType: input.evidenceType,
    evidenceLabel: input.evidenceLabel,
    label: input.label,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }
  try {
    await createChallengeTask({
      userId: s.user.id,
      challengeId: parsed.data.challengeId,
      dayNumber: parsed.data.dayNumber,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      sopContent: parsed.data.sopContent ?? undefined,
      videoUrl: parsed.data.videoUrl ?? undefined,
      evidenceType: parsed.data.evidenceType,
      evidenceLabel: parsed.data.evidenceLabel ?? undefined,
      label: parsed.data.label ?? undefined,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, challengeId: input.challengeId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function deleteTaskAction(input: {
  taskId: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = DeleteChallengeTaskSchema.safeParse({ taskId: input.taskId });
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    await deleteChallengeTask({
      userId: s.user.id,
      taskId: parsed.data.taskId,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, taskId: input.taskId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function joinChallengeAction(input: {
  challengeId: string;
  communityId: string;
  communitySlug: string;
  challengeSlug: string;
  requiresApproval: boolean;
}) {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");

  const communityMembership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: s.user.id,
        communityId: input.communityId,
      },
    },
  });
  if (!communityMembership) redirect(`/c/${input.communitySlug}`);

  try {
    await joinChallenge({
      userId: s.user.id,
      challengeId: input.challengeId,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
  } catch (err) {
    logError(err, { userId: s.user.id, challengeId: input.challengeId });
  }
}
