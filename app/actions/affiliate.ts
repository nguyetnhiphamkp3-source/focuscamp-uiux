"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  getOrCreateAffiliateLink,
  updateAffiliateConfig,
  markAffiliateCommissionPayout,
} from "@/lib/services/affiliate";
import {
  AffiliateLinkCreateSchema,
  AffiliateConfigUpdateSchema,
  AffiliateCommissionPayoutSchema,
} from "@/lib/validations";
import { logError } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function getOrCreateAffiliateLinkAction(input: {
  communityId: string;
}): Promise<ActionResult<{ code: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = AffiliateLinkCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };
  try {
    const link = await getOrCreateAffiliateLink({
      userId: s.user.id,
      communityId: parsed.data.communityId,
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
  const parsed = AffiliateConfigUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };
  try {
    await updateAffiliateConfig({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      enabled: parsed.data.enabled,
      commissionPercent: parsed.data.commissionPercent,
      cookieDays: parsed.data.cookieDays,
    });
    revalidatePath(`/c/${parsed.data.communitySlug}/settings`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function markAffiliateCommissionPayoutAction(input: {
  commissionId: string;
  communityId: string;
  communitySlug: string;
  status: "PAID" | "REJECTED";
  note?: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = AffiliateCommissionPayoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };
  try {
    await markAffiliateCommissionPayout({
      commissionId: parsed.data.commissionId,
      ownerId: s.user.id,
      communityId: parsed.data.communityId,
      status: parsed.data.status,
      note: parsed.data.note,
    });
    revalidatePath(`/c/${parsed.data.communitySlug}/affiliate`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
