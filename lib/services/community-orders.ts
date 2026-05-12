import { prisma } from "@/lib/prisma";

export interface OrderRow {
  orderId: string;
  orderType: "product" | "challenge" | "subscription" | "other";
  status: string;
  createdAt: Date;
  amountVnd: number;
  itemTitle: string;
  itemSubtype: string;
  buyer: { id: string; name: string | null; image: string | null; email: string };
  purchaseId?: string;
  licenseKey?: string | null;
  paymentCode: string;
  receivedAt: Date | null;
}

const VALID_STATUSES = ["PENDING", "COMPLETED", "EXPIRED", "REFUNDED"];

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
      where: { communityId, status: "COMPLETED" },
      _sum: { amountVnd: true },
    }),
    prisma.payment.count({ where: { communityId, status: "PENDING" } }),
    prisma.payment.count({ where: { communityId, ...statusFilter } }),
  ]);

  const payments = await prisma.payment.findMany({
    where: { communityId, ...statusFilter },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  if (payments.length === 0) {
    return { orders: [], total, totalRevenue: Number(revenueAgg._sum.amountVnd ?? 0), pendingCount };
  }

  const userIds = [...new Set(payments.map((p) => p.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true, email: true },
  });
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
    const base = {
      orderId: pay.id,
      status: pay.status,
      createdAt: pay.createdAt,
      amountVnd: Number(pay.amountVnd),
      buyer,
      paymentCode: pay.paymentCode,
      receivedAt: pay.receivedAt,
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
