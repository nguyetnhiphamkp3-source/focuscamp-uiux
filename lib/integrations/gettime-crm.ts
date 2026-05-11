/**
 * Sends a completed purchase to gettime.money CRM via webhook.
 * gettime deduplicates by email, creates/updates CrmContact, and records the order.
 */
import { createHmac } from "crypto";
import { logger } from "@/lib/logger";

const WEBHOOK_URL = process.env.GETTIME_CRM_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.GETTIME_CRM_WEBHOOK_SECRET;

export async function notifyGettimePurchase(params: {
  name: string | null;
  email: string;
  productName: string;
  amountVnd: number;
  orderId: string;
}): Promise<void> {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) return;

  const body = JSON.stringify({
    name: params.name ?? params.email,
    email: params.email,
    product_name: params.productName,
    amount: params.amountVnd,
    order_id: params.orderId,
  });

  const sig = "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": sig,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, orderId: params.orderId }, "[gettime-crm] webhook non-2xx");
    }
  } catch (err) {
    logger.warn({ err, orderId: params.orderId }, "[gettime-crm] webhook failed (non-blocking)");
  }
}
