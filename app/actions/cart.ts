"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/sepay";
import { getPaymentConfig } from "@/lib/community-config";
import { parseCart, serializeCart, addItem, removeItem } from "@/lib/cart";
import { validateCoupon, redeemCouponInTx } from "@/lib/services/coupon";

const CART_COOKIE = "fc_cart";
const COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: false } as const;

export async function addToCartAction(
  productId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) return { ok: false, reason: "not_found" };

    const c = await cookies();
    const current = parseCart(c.get(CART_COOKIE)?.value);
    const updated = addItem(current, productId);
    c.set(CART_COOKIE, serializeCart(updated), COOKIE_OPTS);
    return { ok: true };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

export async function removeFromCartAction(
  productId: string
): Promise<void> {
  const c = await cookies();
  const current = parseCart(c.get(CART_COOKIE)?.value);
  c.set(CART_COOKIE, serializeCart(removeItem(current, productId)), COOKIE_OPTS);
}

export async function clearCartAction(): Promise<void> {
  const c = await cookies();
  c.set(CART_COOKIE, "[]", COOKIE_OPTS);
}

/**
 * AI Native: accepts productIds[] directly (agent) or reads cookie (browser).
 * Returns paymentCode for redirect to /pay/[code].
 */
export async function checkoutCartAction(
  productIdsOverride?: string[],
  options?: { couponCode?: string }
): Promise<{ ok: true; paymentCode: string; free?: boolean } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  let productIds: string[];
  if (productIdsOverride && productIdsOverride.length > 0) {
    productIds = productIdsOverride;
  } else {
    const c = await cookies();
    const items = parseCart(c.get(CART_COOKIE)?.value);
    productIds = items.map((i) => i.productId);
  }

  if (productIds.length === 0) return { ok: false, reason: "cart_empty" };

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true, priceVnd: true, communityId: true, isFree: true, isSubscription: true },
  });

  if (products.length !== productIds.length)
    return { ok: false, reason: "some_products_not_found" };

  const communityIds = [...new Set(products.map((p) => p.communityId))];
  if (communityIds.length > 1)
    return { ok: false, reason: "mixed_communities" };

  // Filter out non-subscription products the user already owns. Subscriptions
  // are renewable so we keep them. If everything gets filtered out, reject.
  const owned = await prisma.purchase.findMany({
    where: { userId: s.user.id, productId: { in: productIds }, status: "COMPLETED" },
    select: { productId: true },
  });
  const ownedIds = new Set(owned.map((o) => o.productId));
  const eligible = products.filter((p) => p.isSubscription || !ownedIds.has(p.id));
  if (eligible.length === 0) return { ok: false, reason: "already_owned" };

  const breakdown = eligible.map((p) => ({
    productId: p.id,
    title: p.title,
    amountVnd: Number(p.priceVnd),
  }));
  productIds = eligible.map((p) => p.id);
  const totalVnd = breakdown.reduce((sum, item) => sum + item.amountVnd, 0);
  if (totalVnd <= 0) return { ok: false, reason: "total_zero" };

  const communityId = communityIds[0] ?? undefined;

  // Re-validate coupon server-side (never trust client-passed discount).
  let coupon: {
    couponId: string;
    couponCode: string;
    discountVnd: number;
    finalAmountVnd: number;
  } | null = null;
  if (options?.couponCode && communityId) {
    const res = await validateCoupon({
      code: options.couponCode,
      communityId,
      userId: s.user.id,
      refType: "cart",
      orderAmountVnd: totalVnd,
      lineItems: breakdown.map((b) => ({ productId: b.productId, amountVnd: b.amountVnd })),
    });
    if (!res.ok) return { ok: false, reason: `coupon_invalid:${res.reason}` };
    coupon = {
      couponId: res.coupon.id,
      couponCode: res.coupon.code,
      discountVnd: res.discountVnd,
      finalAmountVnd: res.finalAmountVnd,
    };
  }
  const finalAmountVnd = coupon ? coupon.finalAmountVnd : totalVnd;

  // Free path: coupon reduces to 0 — create purchases directly, skip SePay.
  if (finalAmountVnd === 0) {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const item of breakdown) {
        await tx.purchase.create({
          data: { userId: s.user!.id!, productId: item.productId, amountVnd: item.amountVnd, status: "COMPLETED" },
        });
      }
      const pmt = await createPayment(
        { userId: s.user!.id!, communityId, purpose: "product", refType: "cart", refId: "cart", amountVnd: 0, metadata: { productIds, breakdown }, coupon: coupon ? { couponId: coupon.couponId, couponCode: coupon.couponCode, originalAmountVnd: totalVnd, discountVnd: coupon.discountVnd } : undefined },
        tx,
      );
      await tx.payment.update({ where: { id: pmt.id }, data: { status: "COMPLETED", receivedAt: now } });
      if (coupon) {
        await redeemCouponInTx(tx, { couponId: coupon.couponId, userId: s.user!.id!, paymentId: pmt.id, discountVnd: coupon.discountVnd, completed: true });
      }
    });
    const c = await cookies();
    c.set(CART_COOKIE, "[]", COOKIE_OPTS);
    return { ok: true, paymentCode: "", free: true };
  }

  let bankCfg: import("@/lib/community-config").PaymentConfig | null = null;
  if (communityId) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { billingModel: true },
    });
    if (community) bankCfg = getPaymentConfig(community);
  }
  if (!bankCfg) return { ok: false, reason: "payment_not_configured" };
  const payment = await prisma.$transaction(async (tx) => {
    const pmt = await createPayment(
      {
        userId: s.user!.id!,
        communityId,
        purpose: "product",
        refType: "cart",
        refId: "cart",
        amountVnd: finalAmountVnd,
        ttlMinutes: 1440,
        metadata: { productIds, breakdown },
        bankCode: bankCfg.bankCode,
        bankAccount: bankCfg.bankAccount,
        bankHolder: bankCfg.bankHolder,
        bankName: bankCfg.bankName,
        coupon: coupon
          ? {
              couponId: coupon.couponId,
              couponCode: coupon.couponCode,
              originalAmountVnd: totalVnd,
              discountVnd: coupon.discountVnd,
            }
          : undefined,
      },
      tx,
    );
    if (coupon) {
      await redeemCouponInTx(tx, {
        couponId: coupon.couponId,
        userId: s.user!.id!,
        paymentId: pmt.id,
        discountVnd: coupon.discountVnd,
      });
    }
    return pmt;
  });

  // Clear cookie after checkout
  const c = await cookies();
  c.set(CART_COOKIE, "[]", COOKIE_OPTS);

  return { ok: true, paymentCode: payment.paymentCode };
}
