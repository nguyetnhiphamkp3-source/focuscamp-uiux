"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { submitCheckin } from "@/lib/services/challenge";
import { ChallengeCheckinSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

export async function checkinAction(input: {
  challengeId: string;
  content: string;
  communitySlug: string;
  challengeSlug: string;
}): Promise<{ ok: boolean; reason?: string; redirectTo?: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = ChallengeCheckinSchema.safeParse({
    challengeId: input.challengeId,
    content: input.content,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const res = await submitCheckin({
      userId: s.user.id,
      challengeId: parsed.data.challengeId,
      content: parsed.data.content,
    });
    revalidatePath(`/c/${input.communitySlug}/challenges/${input.challengeSlug}`);
    revalidatePath(`/c/${input.communitySlug}`);
    if ("completed" in res && res.completed) {
      return {
        ok: true,
        redirectTo: `/c/${input.communitySlug}/challenges/${input.challengeSlug}/completed`,
      };
    }
    return res;
  } catch (err) {
    logError(err, { userId: s.user.id, challengeId: input.challengeId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
