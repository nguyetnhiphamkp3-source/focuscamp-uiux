import { prisma } from "@/lib/prisma";

export type ApprovalSource = "MANUAL" | "SEPAY_WEBHOOK";

export interface OrderApproval {
  source: ApprovalSource;
  /** Admin display name for MANUAL approvals; null for auto or unknown admin. */
  adminName: string | null;
}

export interface AffiliateInfo {
  linkCode: string;
  affiliateName: string | null;
  affiliateEmail: string;
  commissionVnd: number;
  commissionPercent: number;
  payoutStatus: string; // UNPAID | PAID | REJECTED
}

export interface OrderRow {
  orderId: string;
  orderType: "product" | "challenge" | "subscription" | "community" | "other";
  status: string;
  createdAt: Date;
  amountVnd: number;
  /** Pre-discount total. Null when no coupon was applied. */
  originalAmountVnd: number | null;
  /** Discount amount from coupon. Null when no coupon was applied. */
  discountVnd: number | null;
  couponCode: string | null;
  itemTitle: string;
  itemSubtype: string;
  buyer: { id: string; name: string | null; image: string | null; email: string };
  /** IP address captured at checkout time. */
  buyerIp: string | null;
  purchaseId?: string;
  licenseKey?: string | null;
  paymentCode: string;
  provider: string;
  bankName: string | null;
  bankAccount: string | null;
  transactionId: string | null;
  receivedAt: Date | null;
  expiresAt: Date;
  /** Affiliate commission record for this order, if the buyer came via an affiliate link. */
  affiliate: AffiliateInfo | null;
  /** How a COMPLETED order was confirmed. Null for non-completed orders. */
  approval: OrderApproval | null;
}

const VALID_STATUSES = ["PENDING", "COMPLETED", "EXPIRED", "REFUNDED"];

/**
 * Build a paymentId → AffiliateInfo map for a batch of payments.
 *
 * Commission `sourceId` differs by source type (see lib/services/affiliate.ts):
 *   - PRODUCT   → sourceId = purchaseId (the payment's refId)
 *   - CHALLENGE → sourceId = paymentId
 * We collect both keys, query once, then map each commission back to its payment.
 */
async function buildAffiliateMap(
  payments: { id: string; refType: string; refId: string }[],
): Promise<Map<string, AffiliateInfo>> {
  const map = new Map<string, AffiliateInfo>();
  if (!payments.length) return map;

  // sourceId → paymentId reverse lookup, covering both keying schemes.
  const sourceToPayment = new Map<string, string>();
  for (const p of payments) {
    sourceToPayment.set(p.id, p.id); // CHALLENGE keys by paymentId
    if (p.refType === "product") sourceToPayment.set(p.refId, p.id); // PRODUCT keys by purchaseId
  }

  const commissions = await prisma.affiliateCommission.findMany({
    where: { sourceId: { in: [...sourceToPayment.keys()] } },
    include: {
      referral: {
        include: { link: { include: { user: { select: { name: true, email: true } } } } },
      },
    },
  });
  for (const c of commissions) {
    const paymentId = sourceToPayment.get(c.sourceId);
    if (!paymentId) continue;
    map.set(paymentId, {
      linkCode: c.referral.link.code,
      affiliateName: c.referral.link.user.name,
      affiliateEmail: c.referral.link.user.email,
      commissionVnd: Number(c.commissionVnd),
      commissionPercent: Number(c.commissionPercent),
      payoutStatus: c.payoutStatus,
    });
  }
  return map;
}

/**
 * Derive how a payment was confirmed. Prefers the explicit `approvalSource`
 * metadata; falls back to the `MANUAL-` transactionId prefix so orders confirmed
 * before the label existed still display correctly.
 */
function buildApproval(
  pay: { status: string; metadata: unknown; transactionId: string | null },
  userMap: Map<string, { name: string | null; email: string }>,
): OrderApproval | null {
  if (pay.status !== "COMPLETED") return null;
  const meta = (pay.metadata ?? {}) as Record<string, unknown>;
  const raw = meta.approvalSource;
  const source: ApprovalSource =
    raw === "MANUAL" || raw === "SEPAY_WEBHOOK"
      ? raw
      : pay.transactionId?.startsWith("MANUAL-")
        ? "MANUAL"
        : "SEPAY_WEBHOOK";
  if (source !== "MANUAL") return { source, adminName: null };
  const adminId = typeof meta.approvedBy === "string" ? meta.approvedBy : null;
  const admin = adminId ? userMap.get(adminId) : null;
  return { source, adminName: admin ? (admin.name ?? admin.email) : null };
}

export async function listCommunityOrders(
  communityId: string,
  opts: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ orders: OrderRow[]; total: number; totalRevenue: number; pendingCount: number }> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const statusFilter =
    opts.status && VALID_STATUSES.includes(opts.status) ? { status: opts.status } : {};

  const [revenueAgg, pendingCount, total] = await Promise.all([
    prisma.payment.aggregate({
      where: { communityId, purpose: { not: "community_plan" }, status: "COMPLETED" },
      _sum: { amountVnd: true },
    }),
    prisma.payment.count({ where: { communityId, purpose: { not: "community_plan" }, status: "PENDING" } }),
    prisma.payment.count({ where: { communityId, purpose: { not: "community_plan" }, ...statusFilter } }),
  ]);

  const payments = await prisma.payment.findMany({
    where: { communityId, purpose: { not: "community_plan" }, ...statusFilter },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  if (payments.length === 0) {
    return { orders: [], total, totalRevenue: Number(revenueAgg._sum.amountVnd ?? 0), pendingCount };
  }

  // Include approving-admin ids so manual approvals can show the admin's name.
  const adminIds = payments
    .map((p) => ((p.metadata ?? {}) as Record<string, unknown>).approvedBy)
    .filter((x): x is string => typeof x === "string");
  const userIds = [...new Set([...payments.map((p) => p.userId), ...adminIds])];
  const [users, affiliateMap] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true, email: true },
    }),
    buildAffiliateMap(payments),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Product: refId = purchaseId
  const productIds = payments.filter((p) => p.refType === "product").map((p) => p.refId);
  const purchaseMap = new Map<string, { id: string; licenseKey: string | null; product: { title: string; type: string } }>();
  if (productIds.length) {
    const rows = await prisma.purchase.findMany({
      where: { id: { in: productIds } },
      select: { id: true, licenseKey: true, product: { select: { title: true, type: true } } },
    });
    rows.forEach((r) => purchaseMap.set(r.id, r));
  }

  // Challenge: refId = challengeMemberId
  const memberIds = payments.filter((p) => p.refType === "challenge").map((p) => p.refId);
  const challengeMemberMap = new Map<string, { id: string; challenge: { title: string; difficulty: string } }>();
  if (memberIds.length) {
    const rows = await prisma.challengeMember.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, challenge: { select: { title: true, difficulty: true } } },
    });
    rows.forEach((r) => challengeMemberMap.set(r.id, r));
  }

  // Subscription: refId = subscriptionId
  const subIds = payments.filter((p) => p.refType === "subscription").map((p) => p.refId);
  const subMap = new Map<string, { id: string; tier: string }>();
  if (subIds.length) {
    const rows = await prisma.subscription.findMany({
      where: { id: { in: subIds } },
      select: { id: true, tier: true },
    });
    rows.forEach((r) => subMap.set(r.id, r));
  }

  const orders: OrderRow[] = payments.map((pay) => {
    const buyer = userMap.get(pay.userId) ?? {
      id: pay.userId, name: null, image: null, email: pay.userId,
    };
    const meta = (pay.metadata ?? {}) as Record<string, unknown>;
    const base = {
      orderId: pay.id,
      status: pay.status,
      createdAt: pay.createdAt,
      amountVnd: Number(pay.amountVnd),
      originalAmountVnd: pay.originalAmountVnd != null ? Number(pay.originalAmountVnd) : null,
      discountVnd: pay.discountVnd != null ? Number(pay.discountVnd) : null,
      couponCode: pay.couponCode ?? null,
      buyer,
      buyerIp: typeof meta.buyerIp === "string" ? meta.buyerIp : null,
      paymentCode: pay.paymentCode,
      provider: pay.provider,
      bankName: pay.bankName ?? null,
      bankAccount: pay.bankAccount ?? null,
      transactionId: pay.transactionId ?? null,
      receivedAt: pay.receivedAt,
      expiresAt: pay.expiresAt,
      affiliate: affiliateMap.get(pay.id) ?? null,
      approval: buildApproval(pay, userMap),
    };

    if (pay.refType === "product") {
      const p = purchaseMap.get(pay.refId);
      return { ...base, orderType: "product" as const, itemTitle: p?.product.title ?? "Sản phẩm", itemSubtype: p?.product.type ?? "", purchaseId: pay.refId, licenseKey: p?.licenseKey ?? null };
    }
    if (pay.refType === "challenge") {
      const m = challengeMemberMap.get(pay.refId);
      return { ...base, orderType: "challenge" as const, itemTitle: m?.challenge.title ?? "Challenge", itemSubtype: m?.challenge.difficulty ?? "NORMAL" };
    }
    if (pay.refType === "subscription") {
      const s = subMap.get(pay.refId);
      return { ...base, orderType: "subscription" as const, itemTitle: "Membership", itemSubtype: s?.tier ?? "" };
    }
    return { ...base, orderType: "other" as const, itemTitle: pay.purpose, itemSubtype: pay.refType };
  });

  return { orders, total, totalRevenue: Number(revenueAgg._sum.amountVnd ?? 0), pendingCount };
}

export async function listPlatformOrders(
  opts: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ orders: OrderRow[]; total: number; totalRevenue: number; pendingCount: number }> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const statusFilter =
    opts.status && VALID_STATUSES.includes(opts.status) ? { status: opts.status } : {};

  const [revenueAgg, pendingCount, total] = await Promise.all([
    prisma.payment.aggregate({
      where: { purpose: "community_plan", status: "COMPLETED" },
      _sum: { amountVnd: true },
    }),
    prisma.payment.count({ where: { purpose: "community_plan", status: "PENDING" } }),
    prisma.payment.count({ where: { purpose: "community_plan", ...statusFilter } }),
  ]);

  const payments = await prisma.payment.findMany({
    where: { purpose: "community_plan", ...statusFilter },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  if (payments.length === 0) {
    return { orders: [], total, totalRevenue: Number(revenueAgg._sum.amountVnd ?? 0), pendingCount };
  }

  const adminIds = payments
    .map((p) => ((p.metadata ?? {}) as Record<string, unknown>).approvedBy)
    .filter((x): x is string => typeof x === "string");
  const [users, communities, affiliateMap] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: [...new Set([...payments.map((p) => p.userId), ...adminIds])] } },
      select: { id: true, name: true, image: true, email: true },
    }),
    prisma.community.findMany({
      where: { id: { in: [...new Set(payments.map((p) => p.refId))] } },
      select: { id: true, name: true, slug: true, planTier: true },
    }),
    buildAffiliateMap(payments),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const communityMap = new Map(communities.map((c) => [c.id, c]));

  const orders: OrderRow[] = payments.map((pay) => {
    const buyer = userMap.get(pay.userId) ?? {
      id: pay.userId,
      name: null,
      image: null,
      email: pay.userId,
    };
    const community = communityMap.get(pay.refId);
    const meta = (pay.metadata ?? {}) as Record<string, unknown>;
    return {
      orderId: pay.id,
      orderType: "community" as const,
      status: pay.status,
      createdAt: pay.createdAt,
      amountVnd: Number(pay.amountVnd),
      originalAmountVnd: pay.originalAmountVnd != null ? Number(pay.originalAmountVnd) : null,
      discountVnd: pay.discountVnd != null ? Number(pay.discountVnd) : null,
      couponCode: pay.couponCode ?? null,
      itemTitle: community ? `${community.name} (${community.slug})` : "Community plan",
      itemSubtype: community?.planTier ?? pay.refType,
      buyer,
      buyerIp: typeof meta.buyerIp === "string" ? meta.buyerIp : null,
      paymentCode: pay.paymentCode,
      provider: pay.provider,
      bankName: pay.bankName ?? null,
      bankAccount: pay.bankAccount ?? null,
      transactionId: pay.transactionId ?? null,
      receivedAt: pay.receivedAt,
      expiresAt: pay.expiresAt,
      affiliate: affiliateMap.get(pay.id) ?? null,
      approval: buildApproval(pay, userMap),
    };
  });

  return { orders, total, totalRevenue: Number(revenueAgg._sum.amountVnd ?? 0), pendingCount };
}
