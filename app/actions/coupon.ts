"use server";

import { auth } from "@/auth";
import { validateCoupon, COUPON_REJECT_LABELS } from "@/lib/services/coupon";
import { ApplyCouponInputSchema } from "@/lib/validations";

export type ApplyCouponSuccess = {
  ok: true;
  couponId: string;
  couponCode: string;
  discountVnd: number;
  finalAmountVnd: number;
};

export type ApplyCouponFailure = {
  ok: false;
  reason: string;
  message: string;
};

export type ApplyCouponResult = ApplyCouponSuccess | ApplyCouponFailure;

/**
 * Validate a coupon code against an order context. Pure preview — does not
 * create any DB rows. The checkout service re-validates server-side before
 * creating Payment, so any client-tampered discount is rejected then.
 */
export async function applyCouponAction(input: {
  code: string;
  communityId: string;
  refType: "product" | "challenge" | "cart" | "event";
  orderAmountVnd: number;
  refId?: string;
  lineItems?: { productId: string; amountVnd: number }[];
}): Promise<ApplyCouponResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, reason: "unauthorized", message: "Vui lòng đăng nhập" };
  }

  const parsed = ApplyCouponInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const result = await validateCoupon({
    code: parsed.data.code,
    communityId: parsed.data.communityId,
    userId: session.user.id,
    refType: parsed.data.refType,
    orderAmountVnd: parsed.data.orderAmountVnd,
    refId: parsed.data.refId,
    lineItems: parsed.data.lineItems,
  });

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      message: COUPON_REJECT_LABELS[result.reason],
    };
  }

  return {
    ok: true,
    couponId: result.coupon.id,
    couponCode: result.coupon.code,
    discountVnd: result.discountVnd,
    finalAmountVnd: result.finalAmountVnd,
  };
}
