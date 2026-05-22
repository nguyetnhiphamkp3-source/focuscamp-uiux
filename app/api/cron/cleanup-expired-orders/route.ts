import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const EXPIRY_AGE_DAYS = 7;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, reason: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EXPIRY_AGE_DAYS * 24 * 60 * 60 * 1000);

  const expiredPayments = await prisma.payment.findMany({
    where: { status: "EXPIRED", createdAt: { lt: cutoff } },
    select: { id: true, refType: true, refId: true },
  });

  if (expiredPayments.length === 0) {
    logger.info({ cutoff }, "[cron/cleanup-expired-orders] nothing to delete");
    return NextResponse.json({ ok: true, paymentDeleted: 0, purchaseDeleted: 0 });
  }

  // For product payments the linked Purchase row mirrors the same lifecycle —
  // delete it too so the admin Orders list is fully cleared.
  const productPurchaseIds = expiredPayments
    .filter((p) => p.refType === "product")
    .map((p) => p.refId);

  const result = await prisma.$transaction(async (tx) => {
    const purchaseRes = productPurchaseIds.length > 0
      ? await tx.purchase.deleteMany({
          where: { id: { in: productPurchaseIds }, status: { in: ["PENDING", "EXPIRED"] } },
        })
      : { count: 0 };
    const paymentRes = await tx.payment.deleteMany({
      where: { id: { in: expiredPayments.map((p) => p.id) } },
    });
    return { paymentDeleted: paymentRes.count, purchaseDeleted: purchaseRes.count };
  });

  logger.info({ ...result, cutoff }, "[cron/cleanup-expired-orders] done");
  return NextResponse.json({ ok: true, ...result });
}
