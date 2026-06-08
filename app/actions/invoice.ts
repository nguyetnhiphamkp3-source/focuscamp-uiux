"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getInvoiceConfig } from "@/lib/community-config";
import { InvoiceBuyerSchema, type InvoiceBuyerInput } from "@/lib/validations";

type ActionResult = { ok: true } | { ok: false; reason: string };

export async function saveInvoiceBuyerInfoAction(
  input: InvoiceBuyerInput & { paymentCode: string },
): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const payment = await prisma.payment.findUnique({
    where: { paymentCode: input.paymentCode },
    select: {
      id: true,
      paymentCode: true,
      userId: true,
      status: true,
      metadata: true,
      communityId: true,
    },
  });
  if (!payment) return { ok: false, reason: "payment_not_found" };
  if (payment.userId !== s.user.id) return { ok: false, reason: "forbidden" };
  if (payment.status !== "PENDING") return { ok: false, reason: "payment_not_pending" };

  const community = payment.communityId
    ? await prisma.community.findUnique({
        where: { id: payment.communityId },
        select: { invoiceConfig: true },
      })
    : null;
  const cfg = community ? getInvoiceConfig(community) : null;
  if (!cfg?.enabled) return { ok: false, reason: "invoice_not_enabled" };

  const parsed = InvoiceBuyerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      metadata: {
        ...meta,
        invoice: parsed.data,
      } as Prisma.InputJsonValue,
    },
  });
  revalidatePath(`/pay/${payment.paymentCode}`);
  return { ok: true };
}
