/**
 * Payment service — creates Purchase + Payment atomically for products,
 * and handles subscription / challenge-deposit variants too.
 */
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/sepay";
import { logger } from "@/lib/logger";
import { activateCommunityPlan } from "@/lib/services/community";
import { getPaymentConfig } from "@/lib/community-config";
import { validateCoupon, redeemCouponInTx } from "@/lib/services/coupon";
import type { Prisma } from "@prisma/client";

/**
 * Server-side coupon resolution. Re-validates against DB before applying
 * (never trust client-supplied discount values). Returns null on failure;
 * caller is expected to surface an error via the surrounding action result.
 */
async function resolveCoupon(input: {
  couponCode: string | undefined;
  communityId: string;
  userId: string;
  refType: "product" | "challenge" | "cart" | "event";
  orderAmountVnd: number;
}) {
  if (!input.couponCode) return null;
  const res = await validateCoupon({
    code: input.couponCode,
    communityId: input.communityId,
    userId: input.userId,
    refType: input.refType,
    orderAmountVnd: input.orderAmountVnd,
  });
  if (!res.ok) {
    const err = new Error(`coupon_invalid:${res.reason}`);
    (err as Error & { reason?: string }).reason = res.reason;
    throw err;
  }
  return {
    couponId: res.coupon.id,
    couponCode: res.coupon.code,
    originalAmountVnd: input.orderAmountVnd,
    discountVnd: res.discountVnd,
    finalAmountVnd: res.finalAmountVnd,
  };
}

/**
 * Fulfill a bump product attached to a payment. Idempotent: skips re-creating
 * Purchase if user already owns the bump (non-subscription); still marks the
 * payment.metadata.bumpFulfilled=true to prevent retries.
 */
export async function fulfillBumpInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    paymentId: string;
    bumpProductId: string;
    bumpPriceVnd: number;
    transactionId: string;
    meta: Record<string, unknown>;
  },
) {
  const { userId, paymentId, bumpProductId, bumpPriceVnd, transactionId, meta } = params;
  const bumpProd = await tx.product.findUnique({
    where: { id: bumpProductId },
    select: { isSubscription: true },
  });
  const alreadyOwned = !bumpProd?.isSubscription
    ? !!(await tx.purchase.findFirst({
        where: { userId, productId: bumpProductId, status: "COMPLETED" },
        select: { id: true },
      }))
    : false;
  let purchaseId: string | null = null;
  if (!alreadyOwned) {
    const purchase = await tx.purchase.create({
      data: {
        userId,
        productId: bumpProductId,
        amountVnd: bumpPriceVnd,
        status: "COMPLETED",
        paymentRef: transactionId,
      },
    });
    purchaseId = purchase.id;
  }
  await tx.payment.update({
    where: { id: paymentId },
    data: { metadata: { ...meta, bumpFulfilled: true, bumpSkipped: alreadyOwned || undefined } },
  });
  return { purchaseId, skipped: alreadyOwned };
}

export async function startProductPurchase(params: {
  userId: string;
  productId: string;
  effectiveAmountVnd?: number; // override from pricingConfig; defaults to product.priceVnd
  couponCode?: string;
}) {
  const { userId, productId } = params;

  // Coupon validation is read-only side-effect-free; safe to resolve outside the tx.
  // (We re-validate after Purchase row exists to catch race vs other concurrent checkouts.)
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, communityId: true, priceVnd: true, isFree: true, isSubscription: true },
  });
  if (!product) throw new Error("product_not_found");
  if (product.isFree) throw new Error("product_is_free");
  const originalAmountVnd = params.effectiveAmountVnd ?? Number(product.priceVnd);
  if (originalAmountVnd <= 0) throw new Error("product_is_free");

  // Block re-purchase of non-subscription products user already owns.
  // Subscriptions can be re-bought (renew). Defense-in-depth alongside UI hide.
  if (!product.isSubscription) {
    const owned = await prisma.purchase.findFirst({
      where: { userId, productId: product.id, status: "COMPLETED" },
      select: { id: true },
    });
    if (owned) throw new Error("already_purchased");
  }

  const coupon = await resolveCoupon({
    couponCode: params.couponCode,
    communityId: product.communityId,
    userId,
    refType: "product",
    orderAmountVnd: originalAmountVnd,
  });
  const finalAmountVnd = coupon ? coupon.finalAmountVnd : originalAmountVnd;

  const community = await prisma.community.findUnique({
    where: { id: product.communityId },
    select: { billingModel: true },
  });
  const bankCfg = community ? getPaymentConfig(community) : null;
  if (!bankCfg) throw new Error("payment_not_configured");

  const { purchase, payment } = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        userId,
        productId: product.id,
        amountVnd: originalAmountVnd,
        status: "PENDING",
      },
    });
    const payment = await createPayment(
      {
        userId,
        communityId: product.communityId,
        purpose: "product",
        refType: "product",
        refId: purchase.id,
        amountVnd: finalAmountVnd,
        bankCode: bankCfg.bankCode,
        bankAccount: bankCfg.bankAccount,
        bankHolder: bankCfg.bankHolder,
        bankName: bankCfg.bankName,
        coupon: coupon
          ? {
              couponId: coupon.couponId,
              couponCode: coupon.couponCode,
              originalAmountVnd: coupon.originalAmountVnd,
              discountVnd: coupon.discountVnd,
            }
          : undefined,
      },
      tx,
    );
    if (coupon) {
      await redeemCouponInTx(tx, {
        couponId: coupon.couponId,
        userId,
        paymentId: payment.id,
        discountVnd: coupon.discountVnd,
      });
    }
    return { purchase, payment };
  });

  logger.info(
    { userId, productId, paymentCode: payment.paymentCode, couponCode: coupon?.couponCode },
    "[payment] product purchase started"
  );
  return { purchase, payment };
}

export async function startChallengePurchase(params: {
  userId: string;
  challengeId: string;
  communityId: string;
  amountVnd: number;
  couponCode?: string;
}) {
  const { userId, challengeId, communityId, amountVnd } = params;
  const coupon = await resolveCoupon({
    couponCode: params.couponCode,
    communityId,
    userId,
    refType: "challenge",
    orderAmountVnd: amountVnd,
  });
  const finalAmountVnd = coupon ? coupon.finalAmountVnd : amountVnd;
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { billingModel: true },
  });
  const bankCfg = community ? getPaymentConfig(community) : null;
  if (!bankCfg) throw new Error("payment_not_configured");

  const { member, payment } = await prisma.$transaction(async (tx) => {
    const member = await tx.challengeMember.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      update: { status: "PAYMENT_PENDING" },
      create: { challengeId, userId, status: "PAYMENT_PENDING" },
    });
    const payment = await createPayment(
      {
        userId,
        communityId,
        purpose: "challenge_entry",
        refType: "challenge",
        refId: member.id,
        amountVnd: finalAmountVnd,
        bankCode: bankCfg.bankCode,
        bankAccount: bankCfg.bankAccount,
        bankHolder: bankCfg.bankHolder,
        bankName: bankCfg.bankName,
        coupon: coupon
          ? {
              couponId: coupon.couponId,
              couponCode: coupon.couponCode,
              originalAmountVnd: coupon.originalAmountVnd,
              discountVnd: coupon.discountVnd,
            }
          : undefined,
      },
      tx,
    );
    if (coupon) {
      await redeemCouponInTx(tx, {
        couponId: coupon.couponId,
        userId,
        paymentId: payment.id,
        discountVnd: coupon.discountVnd,
      });
    }
    return { member, payment };
  });

  logger.info({ userId, challengeId, paymentCode: payment.paymentCode, couponCode: coupon?.couponCode }, "[payment] challenge entry started");
  return { member, payment };
}

export async function getPaymentStatus(paymentCode: string) {
  const payment = await prisma.payment.findUnique({
    where: { paymentCode },
    select: { id: true, status: true, receivedAt: true, expiresAt: true, couponId: true },
  });
  if (!payment) return null;
  let status = payment.status;
  if (status === "PENDING" && payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { paymentCode },
      data: { status: "EXPIRED" },
    });
    if (payment.couponId) {
      await prisma.couponRedemption.updateMany({
        where: { paymentId: payment.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    }
    status = "EXPIRED";
  }
  return { status, receivedAt: payment.receivedAt };
}

/**
 * Match a transaction to a pending payment.
 * Called by webhook — wraps in a transaction for consistency.
 */
export async function matchSePayTransactionToPayment(params: {
  paymentCode: string | null;
  amount: number;
  transactionId: string;
  rawTxId: string; // SePayTransaction.id for linking
}) {
  const { paymentCode, amount, transactionId, rawTxId } = params;
  if (!paymentCode) return { matched: false, reason: "no_code" };

  const payment = await prisma.payment.findUnique({
    where: { paymentCode },
  });
  if (!payment) return { matched: false, reason: "payment_not_found" };
  if (payment.status !== "PENDING") {
    return { matched: false, reason: "not_pending", status: payment.status };
  }
  const paymentAmount = Number(payment.amountVnd);
  if (Math.abs(paymentAmount - amount) >= 0.01) {
    return {
      matched: false,
      reason: "amount_mismatch",
      expected: paymentAmount,
      got: amount,
    };
  }

  const productCommissionSources: Array<{ purchaseId: string; amountVnd?: number }> = [];

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        receivedAt: new Date(),
        transactionId,
        // Label auto-confirmation so it's distinguishable from manual approval.
        metadata: {
          ...((payment.metadata as Record<string, unknown> | null) ?? {}),
          approvalSource: "SEPAY_WEBHOOK",
        },
      },
    });
    await tx.sePayTransaction.update({
      where: { id: rawTxId },
      data: { matchedPaymentId: payment.id },
    });
    if (payment.couponId) {
      await tx.couponRedemption.updateMany({
        where: { paymentId: payment.id, status: "PENDING" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }
    if (payment.refType === "product") {
      await tx.purchase.updateMany({
        where: { id: payment.refId },
        data: { status: "COMPLETED", paymentRef: transactionId } as unknown as Prisma.PurchaseUpdateManyMutationInput,
      });
      const meta = (payment.metadata ?? {}) as Record<string, unknown>;
      const bumpPrice = Number(meta.bumpPriceVnd ?? 0);
      const mainAmount = paymentAmount - (Number.isFinite(bumpPrice) ? bumpPrice : 0);
      productCommissionSources.push({
        purchaseId: payment.refId,
        amountVnd: Math.max(0, mainAmount),
      });
      if (meta.bumpProductId && !meta.bumpFulfilled) {
        const bump = await fulfillBumpInTx(tx, {
          userId: payment.userId,
          paymentId: payment.id,
          bumpProductId: String(meta.bumpProductId),
          bumpPriceVnd: Number(meta.bumpPriceVnd ?? 0),
          transactionId,
          meta,
        });
        if (bump.purchaseId) {
          productCommissionSources.push({
            purchaseId: bump.purchaseId,
            amountVnd: Number(meta.bumpPriceVnd ?? 0),
          });
        }
      }
    } else if (payment.refType === "challenge") {
      // Always activate on successful payment. Start timing is controlled by
      // Challenge.autoStartAfterHours grace logic, not by this flow.
      await tx.challengeMember.update({
        where: { id: payment.refId },
        data: { status: "ACTIVE", approvedAt: new Date() },
      });
      const meta = (payment.metadata ?? {}) as Record<string, unknown>;
      if (meta.bumpProductId && !meta.bumpFulfilled) {
        const bump = await fulfillBumpInTx(tx, {
          userId: payment.userId,
          paymentId: payment.id,
          bumpProductId: String(meta.bumpProductId),
          bumpPriceVnd: Number(meta.bumpPriceVnd ?? 0),
          transactionId,
          meta,
        });
        if (bump.purchaseId) {
          productCommissionSources.push({
            purchaseId: bump.purchaseId,
            amountVnd: Number(meta.bumpPriceVnd ?? 0),
          });
        }
      }
    } else if (payment.refType === "subscription") {
      const subscription = await tx.subscription.findUnique({
        where: { id: payment.refId },
        select: { userId: true, communityId: true },
      });
      await tx.subscription.updateMany({
        where: { id: payment.refId },
        data: {
          status: "ACTIVE",
          paymentRef: transactionId,
          startedAt: new Date(),
        },
      });
      if (subscription) {
        // Ensure Membership exists; bump memberCount only when newly created.
        const existing = await tx.membership.findUnique({
          where: {
            userId_communityId: {
              userId: subscription.userId,
              communityId: subscription.communityId,
            },
          },
          select: { id: true },
        });
        if (!existing) {
          await tx.membership.create({
            data: {
              userId: subscription.userId,
              communityId: subscription.communityId,
              role: "MEMBER",
            },
          });
          await tx.community.update({
            where: { id: subscription.communityId },
            data: { memberCount: { increment: 1 } },
          });
        }
      }
    } else if (payment.refType === "cart") {
      type CartBreakdownItem = { productId: string; amountVnd: number };
      const meta = (payment.metadata ?? {}) as { breakdown?: CartBreakdownItem[] };
      if (Array.isArray(meta.breakdown) && payment.userId) {
        const originalTotal = meta.breakdown.reduce(
          (sum, item) => sum + Number(item.amountVnd ?? 0),
          0,
        );
        // Defense-in-depth: a Payment created from the cart filter may sit pending
        // while the user buys the same product standalone in another tab. Skip any
        // non-subscription product the user already owns at fulfillment time.
        for (const item of meta.breakdown) {
          const prod = await tx.product.findUnique({
            where: { id: item.productId },
            select: { isSubscription: true },
          });
          const owned = !prod?.isSubscription
            ? !!(await tx.purchase.findFirst({
                where: { userId: payment.userId, productId: item.productId, status: "COMPLETED" },
                select: { id: true },
              }))
            : false;
          if (owned) continue;
          const purchase = await tx.purchase.create({
            data: {
              userId: payment.userId,
              productId: item.productId,
              amountVnd: item.amountVnd,
              status: "COMPLETED",
              paymentRef: transactionId,
            },
          });
          productCommissionSources.push({
            purchaseId: purchase.id,
            amountVnd:
              originalTotal > 0
                ? (paymentAmount * Number(item.amountVnd ?? 0)) / originalTotal
                : Number(item.amountVnd ?? 0),
          });
        }
      }
    }

    // Affiliate commission MUST be atomic with the completion above (H1): write
    // it inside this txn so a crash can't leave a COMPLETED order with no
    // commission row. Idempotency key makes retries safe; errors roll back.
    const { convertReferralFromPurchase, convertReferralFromChallengePayment } =
      await import("./affiliate");
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

  // Community plan activation runs OUTSIDE the txn because it reads + updates
  // Community across services. Idempotent: extending expiry from current value.
  if (payment.refType === "community") {
    try {
      await activateCommunityPlan(payment.refId, {
        paymentCode: payment.paymentCode,
        transactionId,
        amountVnd: paymentAmount,
      });
    } catch (err) {
      logger.error(
        { err, paymentCode, communityId: payment.refId },
        "[payment] community plan activation failed (payment still completed)"
      );
    }
  }

  // License key + affiliate conversion for product purchase
  if (payment.refType === "product") {
    try {
      const { assignLicenseKey } = await import("./license");
      await assignLicenseKey(payment.refId);
    } catch (err) {
      logger.warn({ err, purchaseId: payment.refId }, "[payment] license assign failed");
    }
    // Assign license key for bump product if present
    const metaPost = (payment.metadata ?? {}) as Record<string, unknown>;
    if (metaPost.bumpProductId && !metaPost.bumpFulfilled) {
      try {
        const bumpPurchase = await prisma.purchase.findFirst({
          where: {
            userId: payment.userId,
            productId: String(metaPost.bumpProductId),
            status: "COMPLETED",
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (bumpPurchase) {
          const { assignLicenseKey } = await import("./license");
          await assignLicenseKey(bumpPurchase.id);
        }
      } catch { /* non-critical */ }
    }
    // External notif: purchase completed
    try {
      const purchase = await prisma.purchase.findUnique({
        where: { id: payment.refId },
        select: {
          amountVnd: true,
          product: { select: { title: true, communityId: true } },
          user: { select: { name: true, email: true } },
        },
      });
      if (purchase) {
        const { dispatchToChannels } = await import("./external-notify");
        await dispatchToChannels(
          purchase.product.communityId,
          "purchase_completed",
          {
            title: `💰 Đơn hàng mới: ${purchase.product.title}`,
            description: `${Number(purchase.amountVnd).toLocaleString("vi-VN")}đ`,
          },
        ).catch(() => {});

        // Sync to gettime.money CRM
        const { notifyGettimePurchase } = await import("@/lib/integrations/gettime-crm");
        await notifyGettimePurchase({
          name: purchase.user.name,
          email: purchase.user.email,
          productName: purchase.product.title,
          amountVnd: Number(purchase.amountVnd),
          orderId: payment.refId,
        });
      }
    } catch {
      /* swallow */
    }
  }

  // Event booking confirm
  if (payment.refType === "event") {
    try {
      const { confirmEventBooking } = await import("./event");
      await confirmEventBooking(payment.refId, transactionId);
    } catch (err) {
      logger.warn({ err, bookingId: payment.refId }, "[payment] event confirm failed");
    }
  }

  logger.info(
    { paymentCode, transactionId, amount, refType: payment.refType },
    "[payment] matched + activated"
  );
  return { matched: true };
}
