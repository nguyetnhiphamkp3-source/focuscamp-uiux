import { prisma } from "@/lib/prisma";

export interface OrderRow {
  purchaseId: string;
  purchaseStatus: "PENDING" | "COMPLETED";
  purchaseCreatedAt: Date;
  amountVnd: number;
  licenseKey: string | null;
  product: { id: string; title: string; type: string };
  buyer: { id: string; name: string | null; image: string | null; email: string };
  payment: { status: string; paymentCode: string; receivedAt: Date | null } | null;
}

const PAYMENT_FILTER_STATUSES = ["EXPIRED", "REFUNDED"];

export async function listCommunityOrders(
  communityId: string,
  opts: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ orders: OrderRow[]; total: number; totalRevenue: number; pendingCount: number }> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  // All-time stats — always unfiltered
  const [revenueAgg, pendingCount] = await Promise.all([
    prisma.payment.aggregate({
      where: { communityId, refType: "product", status: "COMPLETED" },
      _sum: { amountVnd: true },
    }),
    prisma.purchase.count({ where: { product: { communityId }, status: "PENDING" } }),
  ]);
  const totalRevenue = Number(revenueAgg._sum.amountVnd ?? 0);

  // EXPIRED / REFUNDED live on Payment.status — query Payment first, then Purchase
  if (opts.status && PAYMENT_FILTER_STATUSES.includes(opts.status)) {
    const matchingPayments = await prisma.payment.findMany({
      where: { communityId, refType: "product", status: opts.status },
      select: { refId: true, status: true, paymentCode: true, receivedAt: true },
    });
    const purchaseIds = matchingPayments.map((p) => p.refId);
    const paymentMap = new Map(matchingPayments.map((p) => [p.refId, p]));

    const purchases = await prisma.purchase.findMany({
      where: { id: { in: purchaseIds } },
      include: {
        product: { select: { id: true, title: true, type: true } },
        user: { select: { id: true, name: true, image: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      orders: purchases.map((p) => toOrderRow(p, paymentMap.get(p.id) ?? null)),
      total: purchaseIds.length,
      totalRevenue,
      pendingCount,
    };
  }

  // PENDING / COMPLETED / ALL — filter on Purchase.status
  const purchaseWhere = {
    product: { communityId },
    ...(opts.status === "COMPLETED" || opts.status === "PENDING" ? { status: opts.status } : {}),
  };

  const [total, purchaseRows] = await Promise.all([
    prisma.purchase.count({ where: purchaseWhere }),
    prisma.purchase.findMany({
      where: purchaseWhere,
      include: {
        product: { select: { id: true, title: true, type: true } },
        user: { select: { id: true, name: true, image: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  const ids = purchaseRows.map((p) => p.id);
  const paymentRows =
    ids.length > 0
      ? await prisma.payment.findMany({
          where: { refType: "product", refId: { in: ids } },
          select: { refId: true, status: true, paymentCode: true, receivedAt: true },
        })
      : [];
  const paymentMap = new Map(paymentRows.map((p) => [p.refId, p]));

  return {
    orders: purchaseRows.map((p) => toOrderRow(p, paymentMap.get(p.id) ?? null)),
    total,
    totalRevenue,
    pendingCount,
  };
}

type PurchaseRow = {
  id: string;
  status: string;
  createdAt: Date;
  amountVnd: { toNumber: () => number } | number;
  licenseKey: string | null;
  product: { id: string; title: string; type: string };
  user: { id: string; name: string | null; image: string | null; email: string };
};

type PaymentSnap = {
  status: string;
  paymentCode: string;
  receivedAt: Date | null;
} | null;

function toOrderRow(p: PurchaseRow, payment: PaymentSnap): OrderRow {
  return {
    purchaseId: p.id,
    purchaseStatus: p.status as "PENDING" | "COMPLETED",
    purchaseCreatedAt: p.createdAt,
    amountVnd: typeof p.amountVnd === "number" ? p.amountVnd : p.amountVnd.toNumber(),
    licenseKey: p.licenseKey,
    product: p.product,
    buyer: p.user,
    payment: payment
      ? { status: payment.status, paymentCode: payment.paymentCode, receivedAt: payment.receivedAt }
      : null,
  };
}
