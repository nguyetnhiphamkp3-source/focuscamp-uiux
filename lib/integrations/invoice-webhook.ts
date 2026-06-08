import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getInvoiceConfig, type InvoiceConfig } from "@/lib/community-config";
import { decryptSecret } from "@/lib/integrations/encryption";
import { logger } from "@/lib/logger";
import { InvoiceBuyerSchema, type InvoiceBuyerInput } from "@/lib/validations";
import { assertSafeWebhookUrl } from "@/lib/webhook-url";

type InvoiceItem = {
  name: string;
  unit: string;
  quantity: 1;
  unit_price_vnd: number;
};

type InvoiceWebhookStatus =
  | { status: "sent"; attemptedAt: string; statusCode: number }
  | { status: "failed"; attemptedAt: string; statusCode?: number; error: string }
  | { status: "skipped"; skippedBy: string; skippedAt: string; reason: "manual_approval" };

function metaObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function vnd(value: unknown): number {
  const n = Math.round(Number(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function splitMainAndBump(input: {
  totalVnd: number;
  mainTitle: string;
  unit: string;
  meta: Record<string, unknown>;
  bumpTitle?: string | null;
}): InvoiceItem[] {
  const bumpPrice = vnd(input.meta.bumpPriceVnd);
  if (!input.meta.bumpProductId || bumpPrice <= 0) {
    return [{ name: input.mainTitle, unit: input.unit, quantity: 1, unit_price_vnd: input.totalVnd }];
  }
  return [
    {
      name: input.mainTitle,
      unit: input.unit,
      quantity: 1,
      unit_price_vnd: Math.max(0, input.totalVnd - bumpPrice),
    },
    {
      name: input.bumpTitle || "Bump offer",
      unit: input.unit,
      quantity: 1,
      unit_price_vnd: bumpPrice,
    },
  ];
}

function allocateCartAmounts(
  lines: Array<{ productId: string; amountVnd: number }>,
  paidTotal: number,
): Map<string, number> {
  const allocations = new Map<string, number>();
  const originalTotal = lines.reduce((sum, item) => sum + vnd(item.amountVnd), 0);
  if (lines.length === 0) return allocations;
  if (originalTotal <= 0) {
    allocations.set(lines[0].productId, paidTotal);
    return allocations;
  }

  let allocated = 0;
  lines.forEach((line, index) => {
    const amount =
      index === lines.length - 1
        ? Math.max(0, paidTotal - allocated)
        : Math.round((paidTotal * vnd(line.amountVnd)) / originalTotal);
    allocated += amount;
    allocations.set(line.productId, amount);
  });
  return allocations;
}

async function resolveBumpTitle(meta: Record<string, unknown>): Promise<string | null> {
  if (typeof meta.bumpProductId !== "string") return null;
  const bump = await prisma.product.findUnique({
    where: { id: meta.bumpProductId },
    select: { title: true },
  });
  return bump?.title ?? null;
}

async function buildInvoiceItems(input: {
  refType: string;
  refId: string;
  purpose: string;
  amountVnd: number;
  unit: string;
  meta: Record<string, unknown>;
}): Promise<InvoiceItem[]> {
  if (input.refType === "product") {
    const purchase = await prisma.purchase.findUnique({
      where: { id: input.refId },
      select: { product: { select: { title: true } } },
    });
    return splitMainAndBump({
      totalVnd: input.amountVnd,
      mainTitle: purchase?.product.title ?? "Sản phẩm",
      unit: input.unit,
      meta: input.meta,
      bumpTitle: await resolveBumpTitle(input.meta),
    });
  }

  if (input.refType === "cart") {
    const rawBreakdown = Array.isArray(input.meta.breakdown) ? input.meta.breakdown : [];
    const lines = rawBreakdown
      .map((item) => metaObject(item))
      .map((item) => ({
        productId: typeof item.productId === "string" ? item.productId : "",
        amountVnd: vnd(item.amountVnd),
      }))
      .filter((item) => item.productId);
    if (lines.length === 0) {
      return [{ name: "Giỏ hàng", unit: input.unit, quantity: 1, unit_price_vnd: input.amountVnd }];
    }

    const products = await prisma.product.findMany({
      where: { id: { in: [...new Set(lines.map((line) => line.productId))] } },
      select: { id: true, title: true },
    });
    const titleMap = new Map(products.map((p) => [p.id, p.title]));
    const allocations = allocateCartAmounts(lines, input.amountVnd);
    return lines.map((line) => ({
      name: titleMap.get(line.productId) ?? "Sản phẩm",
      unit: input.unit,
      quantity: 1,
      unit_price_vnd: allocations.get(line.productId) ?? 0,
    }));
  }

  if (input.refType === "challenge") {
    const member = await prisma.challengeMember.findUnique({
      where: { id: input.refId },
      select: { challenge: { select: { title: true } } },
    });
    return splitMainAndBump({
      totalVnd: input.amountVnd,
      mainTitle: member?.challenge.title ?? "Challenge",
      unit: input.unit,
      meta: input.meta,
      bumpTitle: await resolveBumpTitle(input.meta),
    });
  }

  if (input.refType === "event") {
    const booking = await prisma.eventBooking.findUnique({
      where: { id: input.refId },
      select: { event: { select: { title: true } } },
    });
    return [{ name: booking?.event.title ?? "Sự kiện", unit: input.unit, quantity: 1, unit_price_vnd: input.amountVnd }];
  }

  if (input.refType === "subscription") {
    const sub = await prisma.subscription.findUnique({
      where: { id: input.refId },
      select: { tier: true },
    });
    return [{ name: `Membership ${sub?.tier ?? ""}`.trim(), unit: input.unit, quantity: 1, unit_price_vnd: input.amountVnd }];
  }

  if (input.refType === "community") {
    const community = await prisma.community.findUnique({
      where: { id: input.refId },
      select: { name: true },
    });
    return [{ name: community?.name ?? "Community", unit: input.unit, quantity: 1, unit_price_vnd: input.amountVnd }];
  }

  return [{ name: input.purpose, unit: input.unit, quantity: 1, unit_price_vnd: input.amountVnd }];
}

async function updateInvoiceWebhookStatus(
  paymentId: string,
  value: InvoiceWebhookStatus,
) {
  const latest = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { metadata: true },
  });
  const meta = metaObject(latest?.metadata);
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      metadata: {
        ...meta,
        invoiceWebhook: value,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function markInvoiceWebhookSkipped(input: {
  paymentId: string;
  skippedBy: string;
}) {
  await updateInvoiceWebhookStatus(input.paymentId, {
    status: "skipped",
    reason: "manual_approval",
    skippedBy: input.skippedBy,
    skippedAt: new Date().toISOString(),
  });
}

export async function issueInvoiceForPayment(paymentId: string): Promise<void> {
  const attemptedAt = new Date().toISOString();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      paymentCode: true,
      communityId: true,
      purpose: true,
      refType: true,
      refId: true,
      amountVnd: true,
      metadata: true,
    },
  });
  if (!payment) return;

  const amountVnd = vnd(payment.amountVnd);
  if (amountVnd <= 0) return;
  if (!payment.communityId) return;

  const community = await prisma.community.findUnique({
    where: { id: payment.communityId },
    select: { invoiceConfig: true },
  });
  const cfg = community ? getInvoiceConfig(community) : null;
  if (!cfg?.enabled) return;

  try {
    await assertSafeWebhookUrl(cfg.endpoint || "");
    const authHeaderValue = decryptSecret(cfg.authHeaderValue || "");
    if (!authHeaderValue) throw new Error("invoice_auth_secret_missing");

    const meta = metaObject(payment.metadata);
    const invoice = InvoiceBuyerSchema.safeParse(meta.invoice);
    if (!invoice.success) throw new Error("invoice_buyer_info_missing");

    const items = await buildInvoiceItems({
      refType: payment.refType,
      refId: payment.refId,
      purpose: payment.purpose,
      amountVnd,
      unit: cfg.unit,
      meta,
    });

    const body = JSON.stringify(buildPayload({
      paymentCode: payment.paymentCode,
      buyer: invoice.data,
      cfg,
      items,
    }));

    const res = await fetch(cfg.endpoint || "", {
      method: "POST",
      headers: {
        [cfg.authHeaderName]: authHeaderValue,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": payment.paymentCode,
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      await updateInvoiceWebhookStatus(payment.id, {
        status: "failed",
        attemptedAt,
        statusCode: res.status,
        error: `non_2xx:${res.status}`,
      });
      logger.warn(
        { paymentId: payment.id, status: res.status },
        "[invoice-webhook] webhook non-2xx",
      );
      return;
    }

    await updateInvoiceWebhookStatus(payment.id, {
      status: "sent",
      attemptedAt,
      statusCode: res.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "invoice_webhook_failed";
    await updateInvoiceWebhookStatus(payment.id, {
      status: "failed",
      attemptedAt,
      error: message,
    });
    logger.warn({ err, paymentId: payment.id }, "[invoice-webhook] webhook failed");
  }
}

function buildPayload(input: {
  paymentCode: string;
  buyer: InvoiceBuyerInput;
  cfg: InvoiceConfig;
  items: InvoiceItem[];
}) {
  return {
    external_ref: input.paymentCode,
    buyer_type: input.buyer.buyer_type,
    buyer_name: input.buyer.buyer_name,
    buyer_legal_name: input.buyer.buyer_legal_name || "",
    buyer_tax_code: input.buyer.buyer_tax_code || "",
    buyer_national_id: input.buyer.buyer_national_id || "",
    buyer_address: input.buyer.buyer_address || "",
    buyer_email: input.buyer.buyer_email,
    buyer_phone: input.buyer.buyer_phone || "",
    vat_rate: input.cfg.vatRate,
    payment_method: input.cfg.paymentMethod,
    items: input.items,
  };
}
