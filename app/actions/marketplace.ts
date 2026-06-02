"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createProduct, deleteProduct, setProductFeaturedGlobal, updateProductSettings } from "@/lib/services/marketplace";
import { CreateProductSchema, UpdateProductSettingsSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/sepay";
import { startProductPurchase, fulfillBumpInTx } from "@/lib/services/payment";
import { getPaymentConfig } from "@/lib/community-config";
import { assertChallengeMemberHasCommunityMembership } from "@/lib/services/challenge-member";

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

  // Block paid product creation if community has no SePay config
  const isPaid = !parsed.data.isFree && (parsed.data.priceVnd ?? 0) > 0;
  if (isPaid) {
    const community = await prisma.community.findUnique({
      where: { id: parsed.data.communityId },
      select: { billingModel: true },
    });
    const bankCfg = community ? getPaymentConfig(community) : null;
    if (!bankCfg) {
      return { ok: false, reason: "Bạn cần cấu hình Thanh toán SePay trước khi tạo sản phẩm trả phí." };
    }
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
  showInCartBump?: boolean;
  type?: string;
  pillar?: string | null;
  thumbnailUrl?: string | null;
  fileUrl?: string | null;
  externalUrl?: string | null;
  licenseKeyTemplate?: string | null;
  featuredOnGlobal?: boolean;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = UpdateProductSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };

  // Block setting price > 0 if community has no SePay config
  if (parsed.data.priceVnd && parsed.data.priceVnd > 0) {
    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { communityId: true },
    });
    if (product) {
      const community = await prisma.community.findUnique({
        where: { id: product.communityId },
        select: { billingModel: true },
      });
      const bankCfg = community ? getPaymentConfig(community) : null;
      if (!bankCfg) {
        return { ok: false, reason: "Bạn cần cấu hình Thanh toán SePay trước khi đặt giá sản phẩm." };
      }
    }
  }

  try {
    await updateProductSettings({ userId: s.user.id, ...parsed.data });
    revalidatePath(`/c/${input.communitySlug}/marketplace`);
    revalidatePath(`/c/${input.communitySlug}/marketplace/${input.productSlug}`);
    revalidatePath("/cart");
    revalidatePath("/marketplace");
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, productId: input.productId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function deleteProductAction(input: {
  productId: string;
  communitySlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await deleteProduct({ userId: s.user.id, productId: input.productId });
    revalidatePath(`/c/${input.communitySlug}/marketplace`);
    revalidatePath("/marketplace");
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
      select: { id: true, priceVnd: true, communityId: true, isSubscription: true },
    });
    if (!bump) return { ok: false, reason: "invalid_bump" };
    // Block adding a bump the user already owns (non-subscription only).
    if (!bump.isSubscription) {
      const owned = await prisma.purchase.findFirst({
        where: { userId: s.user.id, productId: bump.id, status: "COMPLETED" },
        select: { id: true },
      });
      if (owned) return { ok: false, reason: "already_owned" };
    }
    const communityId = payment.communityId ?? bump.communityId;
    const community = communityId ? await prisma.community.findUnique({
      where: { id: communityId },
      select: { billingModel: true },
    }) : null;
    const bankCfg = community ? getPaymentConfig(community) : null;
    if (!bankCfg) return { ok: false, reason: "payment_not_configured" };
    await prisma.payment.update({
      where: { paymentCode: input.currentPaymentCode },
      data: { status: "EXPIRED" },
    });
    const newPayment = await createPayment({
      userId: payment.userId,
      communityId: communityId ?? undefined,
      purpose: (payment.purpose as "subscription" | "product" | "challenge_deposit" | "challenge_entry" | "community_plan" | "event"),
      refType: payment.refType as "subscription" | "product" | "challenge" | "community" | "event",
      refId: payment.refId,
      amountVnd: Number(payment.amountVnd) + Number(bump.priceVnd),
      ttlMinutes: 1440,
      metadata: { ...meta, bumpProductId: bump.id, bumpPriceVnd: Number(bump.priceVnd) },
      bankCode: bankCfg.bankCode,
      bankAccount: bankCfg.bankAccount,
      bankHolder: bankCfg.bankHolder,
      bankName: bankCfg.bankName,
    });
    return { ok: true, newPaymentCode: newPayment.paymentCode };
  } catch (err) {
    logError(err, { code: input.currentPaymentCode });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function removeBumpFromPaymentAction(input: {
  currentPaymentCode: string;
}): Promise<{ ok: true; newPaymentCode: string } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    const payment = await prisma.payment.findUnique({ where: { paymentCode: input.currentPaymentCode } });
    if (!payment || payment.status !== "PENDING") return { ok: false, reason: "payment_invalid" };
    if (payment.userId && payment.userId !== s.user.id) return { ok: false, reason: "unauthorized" };
    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    if (!meta.bumpProductId) return { ok: false, reason: "no_bump" };
    const bumpPriceVnd = Number(meta.bumpPriceVnd ?? 0);
    const originalAmount = Number(payment.amountVnd) - bumpPriceVnd;
    const communityId = payment.communityId;
    const community = communityId ? await prisma.community.findUnique({
      where: { id: communityId },
      select: { billingModel: true },
    }) : null;
    const bankCfg = community ? getPaymentConfig(community) : null;
    if (!bankCfg) return { ok: false, reason: "payment_not_configured" };
    await prisma.payment.update({
      where: { paymentCode: input.currentPaymentCode },
      data: { status: "EXPIRED" },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bumpProductId: _bId, bumpPriceVnd: _bPrice, ...restMeta } = meta;
    const newPayment = await createPayment({
      userId: payment.userId,
      communityId: payment.communityId ?? undefined,
      purpose: payment.purpose as "subscription" | "product" | "challenge_deposit" | "challenge_entry" | "community_plan" | "event",
      refType: payment.refType as "subscription" | "product" | "challenge" | "community" | "event",
      refId: payment.refId,
      amountVnd: originalAmount,
      ttlMinutes: 1440,
      metadata: restMeta,
      bankCode: bankCfg.bankCode,
      bankAccount: bankCfg.bankAccount,
      bankHolder: bankCfg.bankHolder,
      bankName: bankCfg.bankName,
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
  if (payment.expiresAt < new Date()) {
    const expired = await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    if (expired.count > 0 && payment.couponId) {
      await prisma.couponRedemption.updateMany({
        where: { paymentId: payment.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    }
    revalidatePath(`/pay/${paymentCode}`);
    return { ok: false, reason: "payment_expired" };
  }

  // Community plan orders are sold by focus.camp; only super admin can mark
  // them completed via /admin/orders. Block self-simulate to close the
  // owner-self-approve loophole.
  if (payment.refType === "community" || payment.purpose === "community_plan") {
    return { ok: false, reason: "platform_order_requires_super_admin" };
  }

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
  const productCommissionSources: Array<{ purchaseId: string; amountVnd?: number }> = [];

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
      const bumpPrice = Number(meta.bumpPriceVnd ?? 0);
      productCommissionSources.push({
        purchaseId: payment.refId,
        amountVnd: Math.max(0, Number(payment.amountVnd) - (Number.isFinite(bumpPrice) ? bumpPrice : 0)),
      });
    } else if (payment.refType === "challenge") {
      // Activate the member; start timing is controlled by Challenge.autoStartAfterHours.
      await assertChallengeMemberHasCommunityMembership(tx, payment.refId);
      await tx.challengeMember.update({
        where: { id: payment.refId },
        data: { status: "ACTIVE", approvedAt: new Date() },
      });
    }

    if (meta.bumpProductId && !meta.bumpFulfilled) {
      const bump = await fulfillBumpInTx(tx, {
        userId: payment.userId,
        paymentId: payment.id,
        bumpProductId: String(meta.bumpProductId),
        bumpPriceVnd: Number(meta.bumpPriceVnd ?? 0),
        transactionId: fakeTransactionId,
        meta,
      });
      if (bump.purchaseId) {
        productCommissionSources.push({
          purchaseId: bump.purchaseId,
          amountVnd: Number(meta.bumpPriceVnd ?? 0),
        });
      }
    }

    // Affiliate commission MUST be atomic with completion (H1) — write inside
    // this txn; errors roll the simulate back, idempotency key makes retries safe.
    const { convertReferralFromPurchase, convertReferralFromChallengePayment } =
      await import("@/lib/services/affiliate");
    for (const source of productCommissionSources) {
      await convertReferralFromPurchase(
        source.purchaseId,
        payment.userId,
        { amountVnd: source.amountVnd },
        tx,
      );
    }
    if (payment.refType === "challenge") {
      await convertReferralFromChallengePayment(payment.id, payment.userId, tx);
    }
  });

  revalidatePath(`/pay/${paymentCode}`);
  return { ok: true };
}

export async function startUpsellPaymentAction(
  upsellProductId: string
): Promise<{ ok: true; paymentCode: string } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    const { payment } = await startProductPurchase({
      userId: s.user.id,
      productId: upsellProductId,
    });
    return { ok: true, paymentCode: payment.paymentCode };
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
