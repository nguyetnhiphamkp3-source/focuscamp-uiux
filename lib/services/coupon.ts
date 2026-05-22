/**
 * Coupon service — validates discount codes and records redemptions.
 *
 * Architecture note: validation happens at the checkout entry point (before
 * createPayment), so the resulting Payment.amountVnd is already discounted.
 * The QR code rendered from amountVnd matches the amount the user must transfer,
 * so the SePay webhook matcher needs no changes — except to flip the redemption
 * row to COMPLETED when the matching payment completes.
 */
import { prisma } from "@/lib/prisma";
import type { Coupon, Prisma } from "@prisma/client";

/** Minimum payment amount enforced by SePay templates. */
const SEPAY_MIN_AMOUNT_VND = 1000;

export type CouponRejectReason =
  | "not_found"
  | "inactive"
  | "expired"
  | "not_yet_valid"
  | "reftype_not_allowed"
  | "community_mismatch"
  | "max_redemptions_reached"
  | "per_user_limit_reached"
  | "min_order_not_met"
  | "min_amount_after_discount"
  | "feature_disabled";

export type ValidateCouponInput = {
  code: string;
  communityId: string;
  userId: string;
  refType: "product" | "challenge" | "cart" | "event";
  orderAmountVnd: number;
};

export type ValidateCouponResult =
  | {
      ok: true;
      coupon: Coupon;
      discountVnd: number;
      finalAmountVnd: number;
    }
  | { ok: false; reason: CouponRejectReason };

/** Compute discount given a coupon + order amount. Returns integer VND, rounded down. */
export function computeDiscount(coupon: Coupon, orderAmountVnd: number): number {
  if (coupon.discountType === "PERCENTAGE") {
    const bps = coupon.percentageBps ?? 0;
    const raw = Math.floor((orderAmountVnd * bps) / 10000);
    const cap = coupon.maxDiscountVnd ? Number(coupon.maxDiscountVnd) : null;
    const capped = cap != null ? Math.min(raw, cap) : raw;
    return Math.max(0, Math.min(capped, orderAmountVnd));
  }
  if (coupon.discountType === "FIXED") {
    const fixed = Number(coupon.fixedAmountVnd ?? 0);
    return Math.max(0, Math.min(Math.floor(fixed), orderAmountVnd));
  }
  return 0;
}

/**
 * Pure validation, no side effects. Used to preview discount in UI and to
 * re-validate inside the checkout service before creating Payment.
 */
export async function validateCoupon(
  input: ValidateCouponInput
): Promise<ValidateCouponResult> {
  if (process.env.FEATURE_COUPON_ENABLED === "false") {
    return { ok: false, reason: "feature_disabled" };
  }

  const normalizedCode = input.code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: {
      communityId_code: {
        communityId: input.communityId,
        code: normalizedCode,
      },
    },
  });
  if (!coupon) return { ok: false, reason: "not_found" };
  if (!coupon.isActive) return { ok: false, reason: "inactive" };
  if (coupon.communityId !== input.communityId) {
    return { ok: false, reason: "community_mismatch" };
  }
  if (!coupon.allowedRefTypes.includes(input.refType)) {
    return { ok: false, reason: "reftype_not_allowed" };
  }
  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    return { ok: false, reason: "not_yet_valid" };
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return { ok: false, reason: "expired" };
  }
  if (coupon.minOrderVnd && input.orderAmountVnd < Number(coupon.minOrderVnd)) {
    return { ok: false, reason: "min_order_not_met" };
  }

  // Redemption limits: count only COMPLETED + PENDING (in-flight) to prevent
  // race-window over-redemption. Cancelled/expired are excluded.
  const activeStatusFilter = { in: ["PENDING", "COMPLETED"] };

  if (coupon.maxRedemptions != null) {
    const total = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, status: activeStatusFilter },
    });
    if (total >= coupon.maxRedemptions) {
      return { ok: false, reason: "max_redemptions_reached" };
    }
  }

  if (coupon.perUserLimit > 0) {
    const byUser = await prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        userId: input.userId,
        status: activeStatusFilter,
      },
    });
    if (byUser >= coupon.perUserLimit) {
      return { ok: false, reason: "per_user_limit_reached" };
    }
  }

  const discountVnd = computeDiscount(coupon, input.orderAmountVnd);
  const finalAmountVnd = input.orderAmountVnd - discountVnd;
  if (finalAmountVnd < SEPAY_MIN_AMOUNT_VND) {
    return { ok: false, reason: "min_amount_after_discount" };
  }

  return { ok: true, coupon, discountVnd, finalAmountVnd };
}

/**
 * Insert a CouponRedemption row inside the caller's DB transaction.
 * Must be called AFTER Payment is created (paymentId is required).
 *
 * Race safety: relies on @@unique([paymentId]) to prevent duplicate
 * redemptions per payment. The maxRedemptions check is performed
 * inside `validateCoupon` — for stricter guarantees, callers can use
 * Serializable isolation, but PENDING + @unique paymentId is sufficient
 * in practice given SePay's per-payment 30-min TTL.
 */
export async function redeemCouponInTx(
  tx: Prisma.TransactionClient,
  input: {
    couponId: string;
    userId: string;
    paymentId: string;
    discountVnd: number;
  }
): Promise<void> {
  await tx.couponRedemption.create({
    data: {
      couponId: input.couponId,
      userId: input.userId,
      paymentId: input.paymentId,
      discountVnd: input.discountVnd,
      status: "PENDING",
    },
  });
}

/** Human-readable Vietnamese label for each reject reason. */
export const COUPON_REJECT_LABELS: Record<CouponRejectReason, string> = {
  not_found: "Mã không tồn tại",
  inactive: "Mã đã bị tạm dừng",
  expired: "Mã đã hết hạn",
  not_yet_valid: "Mã chưa đến ngày hiệu lực",
  reftype_not_allowed: "Mã không áp dụng cho loại đơn này",
  community_mismatch: "Mã không thuộc community này",
  max_redemptions_reached: "Mã đã hết lượt dùng",
  per_user_limit_reached: "Bạn đã dùng mã này rồi",
  min_order_not_met: "Đơn chưa đủ giá trị tối thiểu",
  min_amount_after_discount: "Số tiền sau giảm thấp hơn mức tối thiểu",
  feature_disabled: "Tính năng coupon đang tắt",
};
