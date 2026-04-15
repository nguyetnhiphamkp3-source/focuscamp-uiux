/**
 * SePay webhook receiver.
 *
 * SePay will POST transaction notifications here when bank account receives money.
 * Expected payload (SePay standard):
 * {
 *   id, gateway, transactionDate, accountNumber, code, content,
 *   transferType, amount, referenceCode, accumulated, subAccount,
 *   transferAmount, description
 * }
 *
 * Security:
 * - Verify Authorization header: "Apikey <SEPAY_WEBHOOK_API_KEY>"
 * - Optionally verify source IP (SePay provides IP whitelist)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPaymentCode, activatePayment } from "@/lib/sepay";

interface SePayWebhookPayload {
  id?: string | number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  transferType?: "in" | "out" | "credit" | "debit";
  amount?: string | number;
  referenceCode?: string;
  accumulated?: string | number;
  subAccount?: string | null;
  transferAmount?: string | number;
  description?: string;
}

export async function POST(req: NextRequest) {
  // 1. Verify API key
  const authHeader = req.headers.get("authorization") || "";
  const expectedKey = process.env.SEPAY_WEBHOOK_API_KEY;
  if (!expectedKey) {
    console.error("[SePay webhook] SEPAY_WEBHOOK_API_KEY not set");
    return NextResponse.json(
      { success: false, error: "server_misconfigured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Apikey ${expectedKey}`) {
    console.warn("[SePay webhook] Invalid Authorization");
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // 2. Parse payload (SePay sends JSON)
  let payload: SePayWebhookPayload;
  try {
    payload = (await req.json()) as SePayWebhookPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const {
    id,
    gateway,
    transactionDate,
    accountNumber,
    code, // SePay may pre-extract payment code from content
    content,
    transferType, // in | out
    amount,
    referenceCode,
    accumulated,
    subAccount, // VA if any
  } = payload;

  const transactionId = String(id ?? referenceCode ?? "");
  if (!transactionId) {
    return NextResponse.json(
      { success: false, error: "missing_transaction_id" },
      { status: 400 }
    );
  }

  // 3. Dedup check
  const existing = await prisma.sePayTransaction.findUnique({
    where: { transactionId },
  });
  if (existing) {
    return NextResponse.json({ success: true, note: "already_processed" });
  }

  // 4. Extract payment code (try payload.code first, then parse content)
  const paymentCode =
    (code as string | undefined) ??
    extractPaymentCode(content ?? "") ??
    null;

  // 5. Save raw transaction
  const transferTypeNormalized =
    transferType === "in" || transferType === "credit" ? "credit" : "debit";

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
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      raw: payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  // 6. Match to pending Payment (only credit = tiền vào)
  if (transferTypeNormalized === "credit" && paymentCode) {
    const payment = await prisma.payment.findUnique({
      where: { paymentCode },
    });

    if (payment && payment.status === "PENDING") {
      // Verify amount matches (tolerance: 0 — require exact)
      const paymentAmount = Number(payment.amountVnd);
      const txAmount = Number(amount);
      if (Math.abs(paymentAmount - txAmount) < 0.01) {
        await activatePayment(payment.id, transactionId);
        await prisma.sePayTransaction.update({
          where: { id: tx.id },
          data: { matchedPaymentId: payment.id },
        });
        console.log(
          `[SePay] Matched payment ${payment.paymentCode} (${paymentAmount}đ) to tx ${transactionId}`
        );
      } else {
        console.warn(
          `[SePay] Amount mismatch: payment ${paymentCode} expected ${paymentAmount} got ${txAmount}`
        );
      }
    }
  }

  return NextResponse.json({ success: true });
}
