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

  const now = new Date();
  const orderCutoff = new Date(now.getTime() - EXPIRY_AGE_DAYS * 24 * 60 * 60 * 1000);

  // --- 1) Expired orders (Payment + linked Purchase for product orders) ---
  const expiredPayments = await prisma.payment.findMany({
    where: { status: "EXPIRED", createdAt: { lt: orderCutoff } },
    select: { id: true, refType: true, refId: true },
  });
  const productPurchaseIds = expiredPayments
    .filter((p) => p.refType === "product")
    .map((p) => p.refId);

  const orderResult = expiredPayments.length === 0
    ? { paymentDeleted: 0, purchaseDeleted: 0 }
    : await prisma.$transaction(async (tx) => {
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

  // --- 2) Expired NextAuth sessions ---
  const sessionRes = await prisma.session.deleteMany({ where: { expires: { lt: now } } });

  // --- 3) Expired email verification tokens (NextAuth) ---
  const tokenRes = await prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } });

  // --- 4) Expired Telegram link codes ---
  const telegramRes = await prisma.telegramLinkCode.deleteMany({ where: { expiresAt: { lt: now } } });

  const result = {
    ok: true,
    ...orderResult,
    sessionsDeleted: sessionRes.count,
    verificationTokensDeleted: tokenRes.count,
    telegramLinkCodesDeleted: telegramRes.count,
  };
  logger.info(result, "[cron/cleanup-expired-orders] done");
  return NextResponse.json(result);
}
