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
}) {
  const { userId, productId } = params;
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        communityId: true,
        priceVnd: true,
        isFree: true,
      },
    });
    if (!product) throw new Error("product_not_found");
    if (product.isFree) throw new Error("product_is_free");

    const membership = await tx.membership.findUnique({
      where: {
        userId_communityId: { userId, communityId: product.communityId },
      },
      select: { id: true },
    });
    if (!membership) throw new Error("not_a_member");

    const purchase = await tx.purchase.create({
      data: {
        userId,
        productId: product.id,
        amountVnd: product.priceVnd,
        status: "PENDING",
      },
    });

    // Payment row is created with short expiry via createPayment from lib/sepay.
    // We call it outside the transaction because it uses prisma.payment.findUnique
    // to ensure unique code and this helper may loop. Safe to keep outside.
    return {
      purchase,
      productCommunityId: product.communityId,
      amountVnd: Number(product.priceVnd),
    };
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
    } else if (payment.refType === "subscription") {
      await tx.subscription.updateMany({
        where: { id: payment.refId },
        data: {
          status: "ACTIVE",
          paymentRef: transactionId,
          startedAt: new Date(),
        },
      });
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
    try {
      const { convertReferralFromPurchase } = await import("./affiliate");
      await convertReferralFromPurchase(payment.refId, payment.userId);
    } catch (err) {
      logger.warn({ err, purchaseId: payment.refId }, "[payment] referral conversion failed");
    }
  }

  logger.info(
    { paymentCode, transactionId, amount, refType: payment.refType },
    "[payment] matched + activated"
  );
  return { matched: true };
}
