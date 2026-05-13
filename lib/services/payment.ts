/**
 * Payment service — creates Purchase + Payment atomically for products,
 * and handles subscription / challenge-deposit variants too.
 */
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/sepay";
import { logger } from "@/lib/logger";
import { activateCommunityPlan } from "@/lib/services/community";
import type { Prisma } from "@prisma/client";

export async function startProductPurchase(params: {
  userId: string;
  productId: string;
  effectiveAmountVnd?: number; // override from pricingConfig; defaults to product.priceVnd
}) {
  const { userId, productId } = params;
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, communityId: true, priceVnd: true, isFree: true },
    });
    if (!product) throw new Error("product_not_found");
    if (product.isFree) throw new Error("product_is_free");

    const amountVnd = params.effectiveAmountVnd ?? Number(product.priceVnd);
    if (amountVnd <= 0) throw new Error("product_is_free");

    const purchase = await tx.purchase.create({
      data: { userId, productId: product.id, amountVnd, status: "PENDING" },
    });
    return { purchase, productCommunityId: product.communityId, amountVnd };
  }).then(async (ctx) => {
    const payment = await createPayment({
      userId,
      communityId: ctx.productCommunityId,
      purpose: "product",
      refType: "product",
      refId: ctx.purchase.id,
      amountVnd: ctx.amountVnd,
    });
    logger.info(
      { userId, productId, paymentCode: payment.paymentCode },
      "[payment] product purchase started"
    );
    return { purchase: ctx.purchase, payment };
  });
}

export async function startChallengePurchase(params: {
  userId: string;
  challengeId: string;
  communityId: string;
  amountVnd: number;
}) {
  const { userId, challengeId, communityId, amountVnd } = params;
  const member = await prisma.challengeMember.upsert({
    where: { challengeId_userId: { challengeId, userId } },
    update: { status: "PAYMENT_PENDING" },
    create: { challengeId, userId, status: "PAYMENT_PENDING" },
  });
  const payment = await createPayment({
    userId,
    communityId,
    purpose: "challenge_entry",
    refType: "challenge",
    refId: member.id,
    amountVnd,
  });
  logger.info({ userId, challengeId, paymentCode: payment.paymentCode }, "[payment] challenge entry started");
  return { member, payment };
}

export async function getPaymentStatus(paymentCode: string) {
  const payment = await prisma.payment.findUnique({
    where: { paymentCode },
    select: { status: true, receivedAt: true, expiresAt: true },
  });
  if (!payment) return null;
  let status = payment.status;
  if (status === "PENDING" && payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { paymentCode },
      data: { status: "EXPIRED" },
    });
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

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        receivedAt: new Date(),
        transactionId,
      },
    });
    await tx.sePayTransaction.update({
      where: { id: rawTxId },
      data: { matchedPaymentId: payment.id },
    });
    if (payment.refType === "product") {
      await tx.purchase.updateMany({
        where: { id: payment.refId },
        data: { status: "COMPLETED", paymentRef: transactionId } as unknown as Prisma.PurchaseUpdateManyMutationInput,
      });
      const meta = (payment.metadata ?? {}) as Record<string, unknown>;
      if (meta.bumpProductId && !meta.bumpFulfilled) {
        await tx.purchase.create({
          data: {
            userId: payment.userId,
            productId: String(meta.bumpProductId),
            amountVnd: Number(meta.bumpPriceVnd ?? 0),
            status: "COMPLETED",
            paymentRef: transactionId,
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { metadata: { ...meta, bumpFulfilled: true } },
        });
      }
    } else if (payment.refType === "challenge") {
      // refId = ChallengeMember.id — activate after payment
      const member = await tx.challengeMember.findUnique({
        where: { id: payment.refId },
        select: { challengeId: true },
      });
      if (member) {
        await tx.challengeMember.update({
          where: { id: payment.refId },
          data: {
            status: "ACTIVE",
            approvedAt: new Date(),
            personalStartsAt: new Date(),
          },
        });
      }
      const meta = (payment.metadata ?? {}) as Record<string, unknown>;
      if (meta.bumpProductId && !meta.bumpFulfilled) {
        await tx.purchase.create({
          data: {
            userId: payment.userId!,
            productId: String(meta.bumpProductId),
            amountVnd: Number(meta.bumpPriceVnd ?? 0),
            status: "COMPLETED",
            paymentRef: transactionId,
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { metadata: { ...meta, bumpFulfilled: true } },
        });
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
        await tx.membership.upsert({
          where: {
            userId_communityId: {
              userId: subscription.userId,
              communityId: subscription.communityId,
            },
          },
          create: {
            userId: subscription.userId,
            communityId: subscription.communityId,
            role: "MEMBER",
          },
          update: {},
        });
      }
    } else if (payment.refType === "cart") {
      type CartBreakdownItem = { productId: string; amountVnd: number };
      const meta = (payment.metadata ?? {}) as { breakdown?: CartBreakdownItem[] };
      if (Array.isArray(meta.breakdown)) {
        for (const item of meta.breakdown) {
          await tx.purchase.create({
            data: {
              userId: payment.userId!,
              productId: item.productId,
              amountVnd: item.amountVnd,
              status: "COMPLETED",
              paymentRef: transactionId,
            },
          });
        }
      }
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
    try {
      const { convertReferralFromPurchase } = await import("./affiliate");
      await convertReferralFromPurchase(payment.refId, payment.userId);
    } catch (err) {
      logger.warn({ err, purchaseId: payment.refId }, "[payment] referral conversion failed");
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
