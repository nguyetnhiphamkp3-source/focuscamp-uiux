"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/sepay";
import { getPaymentConfig } from "@/lib/community-config";
import { parseCart, serializeCart, addItem, removeItem } from "@/lib/cart";

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
  productIdsOverride?: string[]
): Promise<{ ok: true; paymentCode: string } | { ok: false; reason: string }> {
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
    select: { id: true, title: true, priceVnd: true, communityId: true, isFree: true },
  });

  if (products.length !== productIds.length)
    return { ok: false, reason: "some_products_not_found" };

  const communityIds = [...new Set(products.map((p) => p.communityId))];
  if (communityIds.length > 1)
    return { ok: false, reason: "mixed_communities" };

  const breakdown = products.map((p) => ({
    productId: p.id,
    title: p.title,
    amountVnd: Number(p.priceVnd),
  }));
  const totalVnd = breakdown.reduce((sum, item) => sum + item.amountVnd, 0);
  if (totalVnd <= 0) return { ok: false, reason: "total_zero" };

  const communityId = communityIds[0] ?? undefined;
  let bankCfg: import("@/lib/community-config").PaymentConfig | null = null;
  if (communityId) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { billingModel: true },
    });
    if (community) bankCfg = getPaymentConfig(community);
  }
  const payment = await createPayment({
    userId: s.user.id,
    communityId,
    purpose: "product",
    refType: "cart",
    refId: "cart",
    amountVnd: totalVnd,
    ttlMinutes: 1440,
    metadata: { productIds, breakdown },
    ...(bankCfg && {
      bankCode: bankCfg.bankCode,
      bankAccount: bankCfg.bankAccount,
      bankHolder: bankCfg.bankHolder,
      bankName: bankCfg.bankName,
    }),
  });

  // Clear cookie after checkout
  const c = await cookies();
  c.set(CART_COOKIE, "[]", COOKIE_OPTS);

  return { ok: true, paymentCode: payment.paymentCode };
}
