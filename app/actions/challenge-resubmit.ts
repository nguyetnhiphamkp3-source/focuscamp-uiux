"use server";

import { auth } from "@/auth";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { resubmitCheckin } from "@/lib/services/challenge";
import { triggerAIReviewIfEnabled } from "@/lib/services/ai-submission-review";
import { ResubmitCheckinSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

type ActionResult = { ok: true } | { ok: false; reason: string };

export async function resubmitCheckinAction(input: {
  checkinId: string;
  content: string;
  linkUrl?: string;
  imageUrls?: string[];
  communitySlug: string;
  challengeSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = ResubmitCheckinSchema.safeParse({
    checkinId: input.checkinId,
    content: input.content,
    linkUrl: input.linkUrl,
    imageUrls: input.imageUrls?.length ? input.imageUrls : undefined,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }
  try {
    await resubmitCheckin({
      userId: s.user.id,
      checkinId: parsed.data.checkinId,
      content: parsed.data.content,
      linkUrl: parsed.data.linkUrl || undefined,
      imageUrls: parsed.data.imageUrls,
    });
    revalidatePath(`/c/${input.communitySlug}/challenges/${input.challengeSlug}`);
    after(() => triggerAIReviewIfEnabled(parsed.data.checkinId));
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, checkinId: input.checkinId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
