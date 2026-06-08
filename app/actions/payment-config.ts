"use server";

import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { InvoiceConfigSchema, PaymentConfigSchema } from "@/lib/community-config";
import { decryptSecret, encryptSecret } from "@/lib/integrations/encryption";
import { logError, logger } from "@/lib/logger";
import { assertCommunityPermission } from "@/lib/services/community-settings";
import {
  generateSepayWebhookKey,
  hashSepayWebhookKey,
  maskSepayWebhookKey,
} from "@/lib/sepay-webhook-key";
import { assertSafeWebhookUrl } from "@/lib/webhook-url";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

type VatRate = -2 | -1 | 0 | 5 | 8 | 10;
type PaymentMethod = "TM" | "CK" | "TM/CK" | "KHAC";

type InvoiceConfigInput = {
  communityId: string;
  communitySlug?: string;
  enabled: boolean;
  endpoint: string;
  authHeaderName: string;
  authHeaderValue: string;
  vatRate: VatRate;
  paymentMethod: PaymentMethod;
  unit: string;
};

type SepayKeyState = {
  hash?: string;
  masked?: string;
  createdAt?: string;
  lastRotatedAt?: string;
};

function existingInvoiceConfig(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function existingString(raw: unknown): string | undefined {
  return typeof raw === "string" && raw ? raw : undefined;
}

function existingPaymentConfig(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function getSepayKeyState(raw: Record<string, unknown>): SepayKeyState {
  const legacyPlain = existingString(raw.sepayApiKey);
  const hash = existingString(raw.sepayApiKeyHash) ?? (legacyPlain ? hashSepayWebhookKey(legacyPlain) : undefined);
  const masked = existingString(raw.sepayApiKeyMasked) ?? (legacyPlain ? maskSepayWebhookKey(legacyPlain) : undefined);
  return {
    hash,
    masked,
    createdAt: existingString(raw.sepayApiKeyCreatedAt),
    lastRotatedAt: existingString(raw.sepayApiKeyLastRotatedAt),
  };
}

function buildPaymentBillingModel(input: {
  bank: {
    bankCode: string;
    bankAccount: string;
    bankHolder: string;
    bankName: string;
  };
  key: SepayKeyState;
  now: string;
}) {
  const keyFields = input.key.hash
    ? {
        sepayApiKeyHash: input.key.hash,
        sepayApiKeyMasked: input.key.masked ?? "sk_************************************",
        sepayApiKeyCreatedAt: input.key.createdAt ?? input.now,
        sepayApiKeyLastRotatedAt: input.key.lastRotatedAt ?? input.now,
      }
    : {};
  return { ...input.bank, ...keyFields };
}

function buildInvoiceTestPayload(input: {
  vatRate: VatRate;
  paymentMethod: PaymentMethod;
  unit: string;
}) {
  return {
    external_ref: `TEST-${Date.now()}`,
    buyer_type: 1,
    buyer_name: "focus.camp Test",
    buyer_legal_name: "",
    buyer_tax_code: "",
    buyer_national_id: "000000000000",
    buyer_address: "Test address",
    buyer_email: "invoice-test@focus.camp",
    buyer_phone: "0900000000",
    vat_rate: input.vatRate,
    payment_method: input.paymentMethod,
    items: [
      {
        name: "Test invoice webhook",
        unit: input.unit || "lần",
        quantity: 1,
        unit_price_vnd: 1000,
      },
    ],
  };
}

async function postInvoiceWebhookTest(input: {
  endpoint: string;
  authHeaderName: string;
  authHeaderValue: string;
  vatRate: VatRate;
  paymentMethod: PaymentMethod;
  unit: string;
}): Promise<{ status: number }> {
  const safeUrl = await assertSafeWebhookUrl(input.endpoint);
  const body = JSON.stringify(
    buildInvoiceTestPayload({
      vatRate: input.vatRate,
      paymentMethod: input.paymentMethod,
      unit: input.unit,
    }),
  );
  const res = await fetch(safeUrl.toString(), {
    method: "POST",
    headers: {
      [input.authHeaderName]: input.authHeaderValue,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": `TEST-${Date.now()}`,
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`webhook_test_non_2xx:${res.status}`);
  return { status: res.status };
}

export async function updatePaymentConfigAction(input: {
  communityId: string;
  communitySlug: string;
  bankCode: string;
  bankAccount: string;
  bankHolder: string;
  bankName: string;
}): Promise<ActionResult<{ sepayApiKey?: string; sepayApiKeyMasked?: string; hasSepayApiKey: boolean }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { billingModel: true },
  });
  if (!community) return { ok: false, reason: "community_not_found" };
  try {
    await assertCommunityPermission(s.user.id, input.communityId, "manage_billing");
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "forbidden" };
  }

  const parsed = PaymentConfigSchema.safeParse({
    bankCode: input.bankCode.trim(),
    bankAccount: input.bankAccount.trim(),
    bankHolder: input.bankHolder.trim().toUpperCase(),
    bankName: input.bankName.trim(),
  });
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  const existing = existingPaymentConfig(community.billingModel);
  const now = new Date().toISOString();
  const keyState = getSepayKeyState(existing);
  let oneTimeKey: string | undefined;
  if (!keyState.hash) {
    oneTimeKey = generateSepayWebhookKey();
    keyState.hash = hashSepayWebhookKey(oneTimeKey);
    keyState.masked = maskSepayWebhookKey(oneTimeKey);
    keyState.createdAt = now;
    keyState.lastRotatedAt = now;
  }

  try {
    await prisma.community.update({
      where: { id: input.communityId },
      data: {
        billingModel: buildPaymentBillingModel({ bank: parsed.data, key: keyState, now }),
      },
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return {
      ok: true,
      data: {
        sepayApiKey: oneTimeKey,
        sepayApiKeyMasked: keyState.masked,
        hasSepayApiKey: !!keyState.hash,
      },
    };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function regenerateWebhookKeyAction(input: {
  communityId: string;
  communitySlug: string;
}): Promise<ActionResult<{ sepayApiKey: string; sepayApiKeyMasked: string; hasSepayApiKey: true }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { billingModel: true },
  });
  if (!community) return { ok: false, reason: "community_not_found" };
  try {
    await assertCommunityPermission(s.user.id, input.communityId, "manage_billing");
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "forbidden" };
  }
  if (!community.billingModel) return { ok: false, reason: "no_config" };

  const existing = existingPaymentConfig(community.billingModel);
  const now = new Date().toISOString();
  const sepayApiKey = generateSepayWebhookKey();
  const keyState = {
    hash: hashSepayWebhookKey(sepayApiKey),
    masked: maskSepayWebhookKey(sepayApiKey),
    createdAt: existingString(existing.sepayApiKeyCreatedAt) ?? now,
    lastRotatedAt: now,
  };
  const parsed = PaymentConfigSchema.safeParse(existing);
  if (!parsed.success) return { ok: false, reason: "invalid_payment_config" };

  try {
    await prisma.community.update({
      where: { id: input.communityId },
      data: {
        billingModel: buildPaymentBillingModel({ bank: parsed.data, key: keyState, now }),
      },
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return {
      ok: true,
      data: {
        sepayApiKey,
        sepayApiKeyMasked: keyState.masked,
        hasSepayApiKey: true,
      },
    };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function testInvoiceWebhookAction(
  input: InvoiceConfigInput,
): Promise<ActionResult<{ status: number }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { invoiceConfig: true },
  });
  if (!community) return { ok: false, reason: "community_not_found" };
  try {
    await assertCommunityPermission(s.user.id, input.communityId, "manage_billing");
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "forbidden" };
  }

  const current = existingInvoiceConfig(community.invoiceConfig);
  const enteredSecret = input.authHeaderValue.trim();
  const storedSecret = existingString(current.authHeaderValue);
  const authHeaderValue = enteredSecret || (storedSecret ? decryptSecret(storedSecret) ?? "" : "");
  const parsed = InvoiceConfigSchema.safeParse({
    enabled: true,
    endpoint: input.endpoint.trim(),
    authHeaderName: input.authHeaderName.trim() || "X-Api-Key",
    authHeaderValue: authHeaderValue || "",
    vatRate: Number(input.vatRate),
    paymentMethod: input.paymentMethod,
    unit: input.unit.trim() || "lần",
  });
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  try {
    const result = await postInvoiceWebhookTest({
      endpoint: parsed.data.endpoint || "",
      authHeaderName: parsed.data.authHeaderName,
      authHeaderValue,
      vatRate: parsed.data.vatRate,
      paymentMethod: parsed.data.paymentMethod,
      unit: parsed.data.unit,
    });
    return { ok: true, data: result };
  } catch (err) {
    logger.warn({ err, communityId: input.communityId }, "[invoice-config] test webhook failed");
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "webhook_test_failed" };
  }
}

export async function updateInvoiceConfigAction(
  input: InvoiceConfigInput & { communitySlug: string },
): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { invoiceConfig: true },
  });
  if (!community) return { ok: false, reason: "community_not_found" };
  try {
    await assertCommunityPermission(s.user.id, input.communityId, "manage_billing");
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "forbidden" };
  }

  const now = new Date().toISOString();
  const current = existingInvoiceConfig(community.invoiceConfig);
  const enteredSecret = input.authHeaderValue.trim();
  const existingStoredSecret = existingString(current.authHeaderValue);
  const storedSecret = enteredSecret
    ? encryptSecret(enteredSecret)
    : existingStoredSecret ?? "";
  const plainSecret = enteredSecret || (existingStoredSecret ? decryptSecret(existingStoredSecret) ?? "" : "");

  const candidate = {
    enabled: input.enabled,
    endpoint: input.endpoint.trim(),
    authHeaderName: input.authHeaderName.trim() || "X-Api-Key",
    authHeaderValue: storedSecret,
    vatRate: Number(input.vatRate),
    paymentMethod: input.paymentMethod,
    unit: input.unit.trim() || "lần",
    createdByUserId: existingString(current.createdByUserId) ?? s.user.id,
    createdAt: existingString(current.createdAt) ?? now,
    updatedByUserId: s.user.id,
    updatedAt: now,
    lastTestAt: existingString(current.lastTestAt),
    lastTestOk: typeof current.lastTestOk === "boolean" ? current.lastTestOk : undefined,
    lastTestedByUserId: existingString(current.lastTestedByUserId),
  };

  const parsed = InvoiceConfigSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  try {
    if (parsed.data.endpoint) {
      await assertSafeWebhookUrl(parsed.data.endpoint);
    }
    if (parsed.data.enabled) {
      const result = await postInvoiceWebhookTest({
        endpoint: parsed.data.endpoint || "",
        authHeaderName: parsed.data.authHeaderName,
        authHeaderValue: plainSecret,
        vatRate: parsed.data.vatRate,
        paymentMethod: parsed.data.paymentMethod,
        unit: parsed.data.unit,
      });
      parsed.data.lastTestAt = now;
      parsed.data.lastTestOk = true;
      parsed.data.lastTestedByUserId = s.user.id;
      logger.info(
        { communityId: input.communityId, status: result.status },
        "[invoice-config] webhook tested during save",
      );
    }

    await prisma.community.update({
      where: { id: input.communityId },
      data: { invoiceConfig: parsed.data as Prisma.InputJsonValue },
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return { ok: true };
  } catch (err) {
    logger.warn({ err, communityId: input.communityId }, "[invoice-config] save failed");
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
