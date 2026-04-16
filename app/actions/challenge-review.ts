"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  reviewSubmission,
  flagSubmissionForReview,
  approveAllPending,
} from "@/lib/services/challenge";
import {
  ReviewSubmissionSchema,
  FlagSubmissionSchema,
  ApproveAllPendingSchema,
} from "@/lib/validations";
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
