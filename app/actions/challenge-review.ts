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
  startChallengeForMember,
} from "@/lib/services/challenge";
import { startChallengePurchase } from "@/lib/services/payment";
import { createPayment } from "@/lib/sepay";
import { getPaymentConfig } from "@/lib/community-config";
import { parsePricingConfig, calculateEffectivePrice } from "@/lib/services/pricing";
import { getUserTier } from "@/lib/services/subscription";
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
  autoStartAfterHours?: number | null;
  title?: string;
  description?: string;
  freezeFromDay?: number | null;
  freezeStartsAt?: string | null;
  freezeEndsAt?: string | null;
  bannerUrl?: string | null;
  featuredOnGlobal?: boolean;
  requiredTier?: string | null;
  pricingConfig?: Record<string, unknown> | null;
  taskUnlockMode?: "ALL" | "DAILY" | "SEQUENTIAL" | "MANUAL";
  unlockIntervalHours?: number;
  freezeWindows?: Array<{ label?: string; startsAt: string; endsAt: string }> | null;
  pitch?: string | null;
  bumpProductId?: string | null;
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = UpdateChallengeSettingsSchema.safeParse({
    challengeId: input.challengeId,
    autoStartAfterHours: input.autoStartAfterHours,
    title: input.title,
    description: input.description,
    freezeFromDay: input.freezeFromDay,
    freezeStartsAt: input.freezeStartsAt,
    freezeEndsAt: input.freezeEndsAt,
    bannerUrl: input.bannerUrl,
    featuredOnGlobal: input.featuredOnGlobal,
    requiredTier: input.requiredTier,
    pricingConfig: input.pricingConfig,
    taskUnlockMode: input.taskUnlockMode,
    unlockIntervalHours: input.unlockIntervalHours,
    freezeWindows: input.freezeWindows,
    pitch: input.pitch,
    bumpProductId: input.bumpProductId,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  // Block setting paid pricing if community has no SePay config
  if (parsed.data.pricingConfig) {
    const pc = parsed.data.pricingConfig as Record<string, unknown>;
    const hasPrice = (pc.basePrice && Number(pc.basePrice) > 0) || (pc.price && Number(pc.price) > 0);
    if (hasPrice) {
      const challenge = await prisma.challenge.findUnique({
        where: { id: parsed.data.challengeId },
        select: { communityId: true },
      });
      if (challenge) {
        const community = await prisma.community.findUnique({
          where: { id: challenge.communityId },
          select: { billingModel: true },
        });
        const bankCfg = community ? getPaymentConfig(community) : null;
        if (!bankCfg) {
          return { ok: false, reason: "Bạn cần cấu hình Thanh toán SePay trước khi đặt phí tham gia challenge." };
        }
      }
    }
  }

  try {
    await updateChallengeSettings({
      userId: s.user.id,
      challengeId: parsed.data.challengeId,
      autoStartAfterHours:
        "autoStartAfterHours" in parsed.data ? parsed.data.autoStartAfterHours ?? null : undefined,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      freezeFromDay: parsed.data.freezeFromDay ?? undefined,
      freezeStartsAt: parsed.data.freezeStartsAt || null,
      freezeEndsAt: parsed.data.freezeEndsAt || null,
      bannerUrl: parsed.data.bannerUrl === undefined ? undefined : parsed.data.bannerUrl || null,
      featuredOnGlobal: parsed.data.featuredOnGlobal,
      requiredTier: parsed.data.requiredTier === undefined ? undefined : parsed.data.requiredTier || null,
      pricingConfig: "pricingConfig" in parsed.data ? (parsed.data.pricingConfig as Record<string, unknown> | null) : undefined,
      taskUnlockMode: parsed.data.taskUnlockMode,
      unlockIntervalHours: parsed.data.unlockIntervalHours,
      freezeWindows: parsed.data.freezeWindows === null ? null : (parsed.data.freezeWindows ?? undefined),
      pitch: parsed.data.pitch ?? undefined,
      bumpProductId: parsed.data.bumpProductId !== undefined ? (parsed.data.bumpProductId ?? null) : undefined,
    });
    bumpChallenge(input.communitySlug, input.challengeSlug);
    revalidatePath(`/marketplace`);
    revalidatePath("/discovery");
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
  evidenceType?: "TEXT" | "LINK" | "IMAGE";
  evidenceLabel?: string;
  label?: string;
  unlockAfterHours?: number | null;
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
    unlockAfterHours: input.unlockAfterHours,
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
      unlockAfterHours: parsed.data.unlockAfterHours,
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
  autoStartAfterHours?: number | null;
  bannerUrl?: string;
  taskUnlockMode?: "ALL" | "DAILY" | "SEQUENTIAL" | "MANUAL";
  unlockIntervalHours?: number;
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
    autoStartAfterHours: input.autoStartAfterHours,
    bannerUrl: input.bannerUrl,
    taskUnlockMode: input.taskUnlockMode,
    unlockIntervalHours: input.unlockIntervalHours,
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
      autoStartAfterHours: parsed.data.autoStartAfterHours ?? null,
      bannerUrl: parsed.data.bannerUrl || undefined,
      taskUnlockMode: parsed.data.taskUnlockMode,
      unlockIntervalHours: parsed.data.unlockIntervalHours,
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
  evidenceType?: "TEXT" | "LINK" | "IMAGE";
  evidenceLabel?: string;
  label?: string;
  unlockAfterHours?: number | null;
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
    unlockAfterHours: input.unlockAfterHours,
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
      unlockAfterHours: parsed.data.unlockAfterHours,
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
}) {
  const s = await auth();
  const returnUrl = `/c/${input.communitySlug}/challenges/${input.challengeSlug}`;
  if (!s?.user?.id) redirect(`/login?redirectTo=${encodeURIComponent(returnUrl)}`);

  const challenge = await prisma.challenge.findUnique({
    where: { id: input.challengeId },
    select: { pricingConfig: true },
  });
  const pricingConfig = parsePricingConfig(challenge?.pricingConfig);

  if (pricingConfig) {
    const membership = await prisma.membership.findUnique({
      where: { userId_communityId: { userId: s.user.id, communityId: input.communityId } },
      select: { aip: true },
    });
    const { tierKey } = membership
      ? await getUserTier({ userId: s.user.id, communityId: input.communityId })
      : { tierKey: null };

    const price = calculateEffectivePrice(pricingConfig, {
      isMember: !!membership,
      tierKey,
      aipBalance: membership?.aip ?? 0,
    });

    if (price.vnd > 0) {
      const { payment } = await startChallengePurchase({
        userId: s.user.id,
        challengeId: input.challengeId,
        communityId: input.communityId,
        amountVnd: price.vnd,
      });
      redirect(`/pay/${payment.paymentCode}?return=${encodeURIComponent(returnUrl)}`);
    }
  }

  try {
    await joinChallenge({ userId: s.user.id, challengeId: input.challengeId });
    bumpChallenge(input.communitySlug, input.challengeSlug);
  } catch (err) {
    logError(err, { userId: s.user.id, challengeId: input.challengeId });
  }
}

export async function payWithAipForChallengeAction(input: {
  challengeId: string;
  communityId: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const [challenge, membership] = await Promise.all([
    prisma.challenge.findUnique({ where: { id: input.challengeId }, select: { pricingConfig: true } }),
    prisma.membership.findUnique({
      where: { userId_communityId: { userId: s.user.id, communityId: input.communityId } },
      select: { id: true, aip: true },
    }),
  ]);

  if (!membership) return { ok: false, reason: "not_a_member" };

  const pricingConfig = parsePricingConfig(challenge?.pricingConfig);
  if (!pricingConfig?.aipEnabled || !pricingConfig.aipPrice) {
    return { ok: false, reason: "aip_not_enabled" };
  }
  if (membership.aip < pricingConfig.aipPrice) {
    return { ok: false, reason: "insufficient_aip" };
  }

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: membership.id },
      data: { aip: { decrement: pricingConfig.aipPrice } },
    }),
    prisma.challengeMember.upsert({
      where: { challengeId_userId: { challengeId: input.challengeId, userId: s.user.id } },
      update: { status: "ACTIVE" },
      create: { challengeId: input.challengeId, userId: s.user.id, status: "ACTIVE" },
    }),
  ]);

  bumpChallenge(input.communitySlug, input.challengeSlug);
  return { ok: true };
}

export async function startChallengeAction(
  input: { challengeId: string; communitySlug: string; challengeSlug: string },
  _formData: FormData
): Promise<void> {
  const s = await auth();
  if (!s?.user?.id) {
    redirect(`/c/${input.communitySlug}/challenges/${input.challengeSlug}`);
  }
  try {
    await startChallengeForMember({ userId: s.user.id, challengeId: input.challengeId });
  } catch {
    // invalid_state — already started or not ACTIVE, redirect anyway to refresh state
  }
  redirect(`/c/${input.communitySlug}/challenges/${input.challengeSlug}`);
}

export async function renewChallengePaymentAction(input: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<{ ok: true; paymentCode: string; amountVnd: number } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const member = await prisma.challengeMember.findFirst({
    where: { challengeId: input.challengeId, userId: s.user.id, status: "PAYMENT_PENDING" },
    include: { challenge: { select: { community: { select: { id: true } } } } },
  });
  if (!member) return { ok: false, reason: "not_found" };

  // Get original price from the first payment attempt
  const originalPayment = await prisma.payment.findFirst({
    where: { refType: "challenge", refId: member.id },
    orderBy: { createdAt: "asc" },
    select: { amountVnd: true },
  });
  if (!originalPayment) return { ok: false, reason: "no_original_payment" };

  // +500k late fee if registration was > 30 minutes ago
  const minutesSinceJoin = (Date.now() - member.joinedAt.getTime()) / 60000;
  const basePriceVnd = Number(originalPayment.amountVnd);
  const newAmount = minutesSinceJoin > 30 ? basePriceVnd + 500000 : basePriceVnd;

  const community = await prisma.community.findUnique({
    where: { id: member.challenge.community.id },
    select: { billingModel: true },
  });
  const bankCfg = community ? getPaymentConfig(community) : null;
  if (!bankCfg) return { ok: false, reason: "payment_not_configured" };

  const payment = await createPayment({
    userId: s.user.id,
    communityId: member.challenge.community.id,
    purpose: "challenge_entry",
    refType: "challenge",
    refId: member.id,
    amountVnd: newAmount,
    bankCode: bankCfg.bankCode,
    bankAccount: bankCfg.bankAccount,
    bankHolder: bankCfg.bankHolder,
    bankName: bankCfg.bankName,
  });

  return { ok: true, paymentCode: payment.paymentCode, amountVnd: newAmount };
}
