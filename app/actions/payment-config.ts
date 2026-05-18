"use server";

import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PaymentConfigSchema } from "@/lib/community-config";
import { logError } from "@/lib/logger";
import { assertCommunityPermission } from "@/lib/services/community-settings";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function updatePaymentConfigAction(input: {
  communityId: string;
  communitySlug: string;
  bankCode: string;
  bankAccount: string;
  bankHolder: string;
  bankName: string;
}): Promise<ActionResult<{ sepayApiKey: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { billingModel: true },
  });
  if (!community) return { ok: false, reason: "community_not_found" };
  try {
    await assertCommunityPermission(s.user.id, input.communityId, "manage_billing");
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "forbidden" };
  }

  const parsed = PaymentConfigSchema.safeParse({
    bankCode: input.bankCode.trim(),
    bankAccount: input.bankAccount.trim(),
    bankHolder: input.bankHolder.trim().toUpperCase(),
    bankName: input.bankName.trim(),
  });
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  // Preserve existing API key or generate new one
  const existing = community.billingModel as Record<string, unknown> | null;
  const sepayApiKey =
    (existing?.sepayApiKey as string) ||
    `sk_${randomBytes(24).toString("hex")}`;

  try {
    await prisma.community.update({
      where: { id: input.communityId },
      data: {
        billingModel: { ...parsed.data, sepayApiKey },
      },
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return { ok: true, data: { sepayApiKey } };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function regenerateWebhookKeyAction(input: {
  communityId: string;
  communitySlug: string;
}): Promise<ActionResult<{ sepayApiKey: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { billingModel: true },
  });
  if (!community) return { ok: false, reason: "community_not_found" };
  try {
    await assertCommunityPermission(s.user.id, input.communityId, "manage_billing");
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "forbidden" };
  }
  if (!community.billingModel) return { ok: false, reason: "no_config" };

  const sepayApiKey = `sk_${randomBytes(24).toString("hex")}`;

  try {
    await prisma.community.update({
      where: { id: input.communityId },
      data: {
        billingModel: { ...(community.billingModel as object), sepayApiKey },
      },
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return { ok: true, data: { sepayApiKey } };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
