"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createProduct, setProductFeaturedGlobal, updateProductSettings } from "@/lib/services/marketplace";
import { CreateProductSchema, UpdateProductSettingsSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/sepay";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function createProductAction(input: {
  communityId: string;
  communitySlug: string;
  slug: string;
  title: string;
  description?: string;
  type?: string;
  pillar?: string;
  priceVnd?: number;
  isFree?: boolean;
  externalUrl?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  licenseKeyTemplate?: string;
}): Promise<ActionResult<{ slug: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreateProductSchema.safeParse({
    communityId: input.communityId,
    slug: input.slug,
    title: input.title,
    description: input.description,
    type: input.type,
    pillar: input.pillar,
    priceVnd: input.priceVnd,
    isFree: input.isFree,
    externalUrl: input.externalUrl,
    fileUrl: input.fileUrl,
    thumbnailUrl: input.thumbnailUrl,
    licenseKeyTemplate: input.licenseKeyTemplate,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const p = await createProduct({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      type: parsed.data.type,
      pillar: parsed.data.pillar || undefined,
      priceVnd: parsed.data.priceVnd,
      isFree: parsed.data.isFree,
      externalUrl: parsed.data.externalUrl ?? undefined,
      fileUrl: parsed.data.fileUrl ?? undefined,
      thumbnailUrl: parsed.data.thumbnailUrl ?? undefined,
      licenseKeyTemplate: parsed.data.licenseKeyTemplate || undefined,
    });
    revalidatePath(`/c/${input.communitySlug}/marketplace`);
    return { ok: true, data: { slug: p.slug } };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function setProductFeaturedGlobalAction(input: {
  productId: string;
  communitySlug: string;
  featured: boolean;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await setProductFeaturedGlobal({
      userId: s.user.id,
      productId: input.productId,
      featured: input.featured,
    });
    revalidatePath(`/c/${input.communitySlug}/marketplace`);
    revalidatePath(`/marketplace`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, productId: input.productId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateProductSettingsAction(input: {
  productId: string;
  communitySlug: string;
  productSlug: string;
  title?: string;
  description?: string | null;
  priceVnd?: number;
  priceOldVnd?: number | null;
  isVisible?: boolean;
  bumpProductId?: string | null;
  upsellProductId?: string | null;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = UpdateProductSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  try {
    await updateProductSettings({ userId: s.user.id, ...parsed.data });
    revalidatePath(`/c/${input.communitySlug}/marketplace`);
    revalidatePath(`/c/${input.communitySlug}/marketplace/${input.productSlug}`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, productId: input.productId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function addBumpToPaymentAction(input: {
  currentPaymentCode: string;
  bumpProductId: string;
}): Promise<{ ok: true; newPaymentCode: string } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    const payment = await prisma.payment.findUnique({ where: { paymentCode: input.currentPaymentCode } });
    if (!payment || payment.status !== "PENDING") return { ok: false, reason: "payment_invalid" };
    if (payment.userId && payment.userId !== s.user.id) return { ok: false, reason: "unauthorized" };
    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    if (meta.bumpProductId) return { ok: false, reason: "bump_already_added" };
    const bump = await prisma.product.findUnique({
      where: { id: input.bumpProductId },
      select: { id: true, priceVnd: true, communityId: true },
    });
    if (!bump) return { ok: false, reason: "invalid_bump" };
    await prisma.payment.update({
      where: { paymentCode: input.currentPaymentCode },
      data: { status: "EXPIRED" },
    });
    const newPayment = await createPayment({
      userId: payment.userId,
      communityId: payment.communityId ?? undefined,
      purpose: (payment.purpose as "subscription" | "product" | "challenge_deposit" | "challenge_entry" | "community_plan" | "event"),
      refType: payment.refType as "subscription" | "product" | "challenge" | "community" | "event",
      refId: payment.refId,
      amountVnd: Number(payment.amountVnd) + Number(bump.priceVnd),
      ttlMinutes: 1440,
      metadata: { ...meta, bumpProductId: bump.id, bumpPriceVnd: Number(bump.priceVnd) },
    });
    return { ok: true, newPaymentCode: newPayment.paymentCode };
  } catch (err) {
    logError(err, { code: input.currentPaymentCode });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function simulatePaymentCompletedAction(
  paymentCode: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const payment = await prisma.payment.findUnique({ where: { paymentCode } });
  if (!payment || payment.status !== "PENDING") return { ok: false, reason: "payment_invalid" };

  if (payment.communityId) {
    const community = await prisma.community.findUnique({
      where: { id: payment.communityId },
      select: { ownerId: true },
    });
    if (community?.ownerId !== s.user.id) return { ok: false, reason: "unauthorized" };
  } else {
    return { ok: false, reason: "unauthorized" };
  }

  const fakeTransactionId = `SIM_${Date.now()}`;
  const meta = (payment.metadata ?? {}) as Record<string, unknown>;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED", receivedAt: new Date(), transactionId: fakeTransactionId },
    });

    if (payment.refType === "product") {
      await tx.purchase.updateMany({
        where: { id: payment.refId },
        data: { status: "COMPLETED", paymentRef: fakeTransactionId },
      });
    } else if (payment.refType === "challenge") {
      const member = await tx.challengeMember.findUnique({
        where: { id: payment.refId },
        select: { challengeId: true },
      });
      if (member) {
        const challenge = await tx.challenge.findUnique({
          where: { id: member.challengeId },
          select: { requiresApproval: true },
        });
        await tx.challengeMember.update({
          where: { id: payment.refId },
          data: {
            status: challenge?.requiresApproval ? "PENDING" : "ACTIVE",
            approvedAt: challenge?.requiresApproval ? undefined : new Date(),
            personalStartsAt: challenge?.requiresApproval ? undefined : new Date(),
          },
        });
      }
    }

    if (meta.bumpProductId && !meta.bumpFulfilled) {
      await tx.purchase.create({
        data: {
          userId: payment.userId!,
          productId: String(meta.bumpProductId),
          amountVnd: Number(meta.bumpPriceVnd ?? 0),
          status: "COMPLETED",
          paymentRef: fakeTransactionId,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { metadata: { ...meta, bumpFulfilled: true } },
      });
    }
  });

  revalidatePath(`/pay/${paymentCode}`);
  return { ok: true };
}
