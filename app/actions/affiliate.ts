"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  getOrCreateAffiliateLink,
  updateAffiliateConfig,
} from "@/lib/services/affiliate";
import { logError } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function getOrCreateAffiliateLinkAction(input: {
  communityId: string;
}): Promise<ActionResult<{ code: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    const link = await getOrCreateAffiliateLink({
      userId: s.user.id,
      communityId: input.communityId,
    });
    return { ok: true, data: { code: link.code } };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateAffiliateConfigAction(input: {
  communityId: string;
  communitySlug: string;
  enabled: boolean;
  commissionPercent: number;
  cookieDays: number;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  if (input.commissionPercent < 0 || input.commissionPercent > 100) {
    return { ok: false, reason: "commission_out_of_range" };
  }
  try {
    await updateAffiliateConfig({
      userId: s.user.id,
      communityId: input.communityId,
      enabled: input.enabled,
      commissionPercent: input.commissionPercent,
      cookieDays: input.cookieDays,
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
