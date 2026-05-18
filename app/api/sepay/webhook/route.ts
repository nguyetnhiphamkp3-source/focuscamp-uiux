/**
 * SePay webhook receiver.
 *
 * Security:
 * - Authorization: "Apikey <SEPAY_WEBHOOK_API_KEY>"
 * - Rate limited per IP
 * - Input validated via Zod
 * - Business logic delegated to lib/services/payment.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPaymentCode } from "@/lib/sepay";
import { SePayWebhookSchema } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger, logError } from "@/lib/logger";
import { matchSePayTransactionToPayment } from "@/lib/services/payment";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 0. Rate limit per IP (60 req / min — SePay rarely sends >1/sec)
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `sepay:${ip}`, limit: 60, windowSec: 60 });
  if (!rl.ok) {
    logger.warn({ ip, resetAt: rl.resetAt }, "[SePay webhook] rate limited");
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 1. Verify API key (platform key OR per-community key)
  const authHeader = req.headers.get("authorization") || "";
  const providedKey = authHeader.startsWith("Apikey ") ? authHeader.slice(7) : "";
  const platformKey = process.env.SEPAY_WEBHOOK_API_KEY;
  if (!platformKey) {
    logger.error("[SePay webhook] SEPAY_WEBHOOK_API_KEY not set");
    return NextResponse.json(
      { success: false, error: "server_misconfigured" },
      { status: 500 }
    );
  }
  let keyValid = providedKey === platformKey;
  if (!keyValid && providedKey) {
    // Check if key matches any community's sepayApiKey
    const community = await prisma.community.findFirst({
      where: { billingModel: { path: ["sepayApiKey"], equals: providedKey } },
      select: { id: true },
    });
    keyValid = !!community;
  }
  if (!keyValid) {
    logger.warn({ ip }, "[SePay webhook] unauthorized");
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // 2. Parse + validate payload
  let payload;
  try {
    const raw = await req.json();
    payload = SePayWebhookSchema.parse(raw);
  } catch (err) {
    logError(err, { ip, note: "invalid payload" });
    return NextResponse.json(
      { success: false, error: "invalid_payload" },
      { status: 400 }
    );
  }

  const {
    id,
    gateway,
    transactionDate,
    accountNumber,
    code,
    content,
    transferType,
    amount,
    referenceCode,
    accumulated,
    subAccount,
  } = payload;

  const transactionId = String(id ?? referenceCode ?? "");
  if (!transactionId) {
    return NextResponse.json(
      { success: false, error: "missing_transaction_id" },
      { status: 400 }
    );
  }

  try {
    // 3. Dedup check
    const existing = await prisma.sePayTransaction.findUnique({
      where: { transactionId },
    });
    if (existing) {
      logger.info({ transactionId }, "[SePay] already processed");
      return NextResponse.json({ success: true, note: "already_processed" });
    }

    // 4. Extract payment code
    const paymentCode =
      (code as string | undefined) ??
      extractPaymentCode(content ?? "") ??
      null;

    const transferTypeNormalized =
      transferType === "in" || transferType === "credit" ? "credit" : "debit";

    // 5. Save raw transaction
    const tx = await prisma.sePayTransaction.create({
      data: {
        transactionId,
        referenceCode: referenceCode ?? null,
        gateway: gateway ?? "unknown",
        accountNumber: accountNumber ?? null,
        vaNumber: subAccount ?? null,
        paymentCode,
        content: content ?? "",
        transferType: transferTypeNormalized,
        amount: Number(amount) || 0,
        accumulated: accumulated ? Number(accumulated) : null,
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date(),
        raw: payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    // 6. Match + activate (if credit)
    if (transferTypeNormalized === "credit" && paymentCode) {
      const matchResult = await matchSePayTransactionToPayment({
        paymentCode,
        amount: Number(amount) || 0,
        transactionId,
        rawTxId: tx.id,
      });
      if (!matchResult.matched) {
        logger.warn(
          { paymentCode, transactionId, reason: matchResult.reason },
          "[SePay] not matched"
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logError(err, { transactionId });
    return NextResponse.json(
      { success: false, error: "internal" },
      { status: 500 }
    );
  }
}
