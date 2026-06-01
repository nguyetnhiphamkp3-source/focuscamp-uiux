/**
 * SePay thường — helpers
 *
 * Flow:
 * 1. User bấm mua → createPayment() tạo Payment record với paymentCode unique
 * 2. UI hiện QR VietQR với content chứa paymentCode
 * 3. User chuyển khoản → SePay webhook POST tới /api/sepay/webhook
 * 4. handleWebhook() match paymentCode → activate purchase/subscription
 */

import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/**
 * Generate a unique payment code with crypto-grade randomness.
 * Example: DHFCABCDEFGH (prefix + 8 chars, A-Z2-9, no 0/O/1/I).
 */
export function generatePaymentCode(prefix = "DHFC"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[buf[i] % chars.length];
  }
  return `${prefix}${suffix}`;
}

/**
 * Build VietQR URL for display.
 * Uses vietqr.io's free API — generates QR image directly.
 */
export function buildVietQRUrl(params: {
  bankCode: string; // "MB", "VCB", "ACB", etc. (Napas bank code)
  accountNumber: string;
  amount: number;
  paymentCode: string;
  accountHolder?: string;
}): string {
  const { bankCode, accountNumber, amount, paymentCode, accountHolder } = params;
  const template = "compact2"; // compact with amount + content
  const base = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png`;
  const q = new URLSearchParams({
    amount: String(amount),
    addInfo: paymentCode,
  });
  if (accountHolder) q.set("accountName", accountHolder);
  return `${base}?${q.toString()}`;
}

/**
 * Create a Payment record with a unique code.
 * Expires in 30 minutes by default.
 */
export async function createPayment(
  params: {
    userId: string;
    communityId?: string;
    purpose:
      | "subscription"
      | "product"
      | "challenge_deposit"
      | "challenge_entry"
      | "community_plan"
      | "event";
    refType: "subscription" | "product" | "challenge" | "community" | "event" | "cart";
    refId: string;
    amountVnd: number;
    ttlMinutes?: number;
    metadata?: Record<string, unknown>;
    bankCode?: string;
    bankAccount?: string;
    bankHolder?: string;
    bankName?: string;
    /** Discount details — set when a coupon was applied. amountVnd above must already be the discounted final amount. */
    coupon?: {
      couponId: string;
      couponCode: string;
      originalAmountVnd: number;
      discountVnd: number;
    };
  },
  /** Optional transaction client. When provided, the Payment row is created
   * inside the caller's transaction so callers can atomically chain other
   * writes (e.g., CouponRedemption) without orphaning state on failure. */
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const ttl = params.ttlMinutes ?? 30;
  let paymentCode = generatePaymentCode();
  // Ensure unique (extremely unlikely collision, but safe)
  while (await db.payment.findUnique({ where: { paymentCode } })) {
    paymentCode = generatePaymentCode();
  }

  const meta = {
    ...(params.metadata ?? {}),
    ...(params.bankCode ? { bankCode: params.bankCode } : {}),
    ...(params.bankHolder ? { bankHolder: params.bankHolder } : {}),
  };
  const hasMetadata = Object.keys(meta).length > 0;

  return db.payment.create({
    data: {
      paymentCode,
      userId: params.userId,
      communityId: params.communityId,
      purpose: params.purpose,
      refType: params.refType,
      refId: params.refId,
      amountVnd: params.amountVnd,
      ...(params.coupon && {
        originalAmountVnd: params.coupon.originalAmountVnd,
        discountVnd: params.coupon.discountVnd,
        couponId: params.coupon.couponId,
        couponCode: params.coupon.couponCode,
      }),
      status: "PENDING",
      provider: "SEPAY_STANDARD",
      bankName: params.bankName ?? process.env.SEPAY_BANK_NAME,
      bankAccount: params.bankAccount ?? process.env.SEPAY_BANK_ACCOUNT,
      expiresAt: new Date(Date.now() + ttl * 60 * 1000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(hasMetadata && { metadata: meta as any }),
    },
  });
}

/**
 * Extract paymentCode from SePay webhook content.
 * SePay payload may have `code` field (pre-parsed), or we parse from `content`.
 */
export function extractPaymentCode(content: string): string | null {
  if (!content) return null;
  // Match new DHFC prefix (DHFC first so it wins over the legacy FC branch on a
  // DHFC code) and legacy FC prefix, each followed by 8 alphanumeric chars.
  const match = content.match(/\b(?:DHFC|FC)[A-Z0-9]{8}\b/);
  return match ? match[0] : null;
}

/**
 * Activate the resource tied to a Payment (subscription, product, etc.)
 */
export async function activatePayment(paymentId: string, transactionId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, reason: "payment_not_found" };
  if (payment.status !== "PENDING") return { ok: true, reason: "already_processed" };

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "COMPLETED", receivedAt: new Date(), transactionId },
  });

  // Activate based on refType
  if (payment.refType === "product") {
    await prisma.purchase.updateMany({
      where: { id: payment.refId },
      data: { status: "COMPLETED", paymentRef: transactionId },
    });
  } else if (payment.refType === "subscription") {
    const subscription = await prisma.subscription.findUnique({
      where: { id: payment.refId },
      select: { userId: true, communityId: true },
    });
    await prisma.subscription.updateMany({
      where: { id: payment.refId },
      data: { status: "ACTIVE", paymentRef: transactionId, startedAt: new Date() },
    });
    if (subscription) {
      await prisma.membership.upsert({
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
  }
  // challenge_deposit: just mark payment completed, challenge join logic handles rest

  return { ok: true, reason: "activated" };
}
