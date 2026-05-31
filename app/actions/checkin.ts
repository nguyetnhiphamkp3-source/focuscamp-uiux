"use server";

import { auth } from "@/auth";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { submitCheckin } from "@/lib/services/challenge";
import { triggerAIReviewIfEnabled } from "@/lib/services/ai-submission-review";
import { ChallengeCheckinSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function checkinAction(input: {
  challengeId: string;
  content: string;
  taskId?: string;
  dayNumber?: number;
  linkUrl?: string;
  imageUrls?: string[];
  communitySlug: string;
  challengeSlug: string;
}): Promise<{ ok: boolean; reason?: string; redirectTo?: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  // 5 checkins/min/user — typically only 1/day per challenge but cap spam
  const rl = await rateLimit({
    key: `checkin:${s.user.id}`,
    limit: 5,
    windowSec: 60,
  });
  if (!rl.ok) return { ok: false, reason: "rate_limited" };

  const parsed = ChallengeCheckinSchema.safeParse({
    challengeId: input.challengeId,
    content: input.content,
    taskId: input.taskId,
    dayNumber: input.dayNumber,
    linkUrl: input.linkUrl || undefined,
    imageUrls: input.imageUrls?.length ? input.imageUrls : undefined,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const res = await submitCheckin({
      userId: s.user.id,
      challengeId: parsed.data.challengeId,
      content: parsed.data.content,
      taskId: parsed.data.taskId,
      dayNumber: parsed.data.dayNumber,
      linkUrl: parsed.data.linkUrl || undefined,
      imageUrls: parsed.data.imageUrls,
    });
    revalidatePath(`/c/${input.communitySlug}/challenges/${input.challengeSlug}`);
    revalidatePath(`/c/${input.communitySlug}`);
    if (res.checkinId) {
      after(() => triggerAIReviewIfEnabled(res.checkinId));
    }
    // No auto-complete on submit — completion is granted on approval (reviewSubmission).
    return res;
  } catch (err) {
    logError(err, { userId: s.user.id, challengeId: input.challengeId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
