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

/**
 * Generate a unique payment code with crypto-grade randomness.
 * Example: FC1A2B3C4D (10 chars, A-Z0-9, no 0/O/1/I).
 */
export function generatePaymentCode(prefix = "FC"): string {
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
export async function createPayment(params: {
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
}) {
  const ttl = params.ttlMinutes ?? 30;
  let paymentCode = generatePaymentCode();
  // Ensure unique (extremely unlikely collision, but safe)
  while (await prisma.payment.findUnique({ where: { paymentCode } })) {
    paymentCode = generatePaymentCode();
  }

  return prisma.payment.create({
    data: {
      paymentCode,
      userId: params.userId,
      communityId: params.communityId,
      purpose: params.purpose,
      refType: params.refType,
      refId: params.refId,
      amountVnd: params.amountVnd,
      status: "PENDING",
      provider: "SEPAY_STANDARD",
      bankName: process.env.SEPAY_BANK_NAME,
      bankAccount: process.env.SEPAY_BANK_ACCOUNT,
      expiresAt: new Date(Date.now() + ttl * 60 * 1000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(params.metadata !== undefined && { metadata: params.metadata as any }),
    },
  });
}

/**
 * Extract paymentCode from SePay webhook content.
 * SePay payload may have `code` field (pre-parsed), or we parse from `content`.
 */
export function extractPaymentCode(content: string): string | null {
  if (!content) return null;
  // Look for FC followed by 8 uppercase alphanumeric chars
  const match = content.match(/\bFC[A-Z0-9]{8}\b/);
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
