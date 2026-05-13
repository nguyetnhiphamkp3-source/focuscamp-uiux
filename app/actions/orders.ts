"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logError, logger } from "@/lib/logger";

type ActionResult = { ok: true } | { ok: false; reason: string };

export async function approveOrderAction(input: {
  purchaseId: string;
  communitySlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const purchase = await prisma.purchase.findUnique({
    where: { id: input.purchaseId },
    select: {
      id: true,
      status: true,
      product: { select: { communityId: true, title: true, community: { select: { ownerId: true } } } },
      user: { select: { name: true, email: true } },
      amountVnd: true,
    },
  });

  if (!purchase) return { ok: false, reason: "not_found" };
  if (purchase.product.community.ownerId !== s.user.id) return { ok: false, reason: "unauthorized" };
  if (purchase.status !== "PENDING") return { ok: false, reason: "already_processed" };

  const manualRef = `MANUAL-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: "COMPLETED", paymentRef: manualRef },
    });
    await tx.payment.updateMany({
      where: { refType: "product", refId: purchase.id, status: "PENDING" },
      data: { status: "COMPLETED", receivedAt: new Date(), transactionId: manualRef },
    });
  });

  // Assign license key if applicable
  try {
    const { assignLicenseKey } = await import("@/lib/services/license");
    await assignLicenseKey(purchase.id);
  } catch (err) {
    logger.warn({ err, purchaseId: purchase.id }, "[orders] manual approve: license assign failed");
  }

  // Send notification
  try {
    const { dispatchToChannels } = await import("@/lib/services/external-notify");
    await dispatchToChannels(
      purchase.product.communityId,
      "purchase_completed",
      {
        title: `💰 Duyệt thủ công: ${purchase.product.title}`,
        description: `${Number(purchase.amountVnd).toLocaleString("vi-VN")}đ — ${purchase.user.name ?? purchase.user.email}`,
      },
    ).catch(() => {});
  } catch (err) {
    logger.warn({ err, purchaseId: purchase.id }, "[orders] manual approve: notify failed");
  }

  // Sync to gettime.money CRM
  try {
    const { notifyGettimePurchase } = await import("@/lib/integrations/gettime-crm");
    await notifyGettimePurchase({
      name: purchase.user.name,
      email: purchase.user.email,
      productName: purchase.product.title,
      amountVnd: Number(purchase.amountVnd),
      orderId: purchase.id,
    });
  } catch (err) {
    logger.warn({ err, purchaseId: purchase.id }, "[orders] manual approve: gettime sync failed");
  }

  logger.info({ purchaseId: purchase.id, adminId: s.user.id, ref: manualRef }, "[orders] manually approved");
  revalidatePath(`/c/${input.communitySlug}/orders`);
  return { ok: true };
}

export async function approvePaymentAction(input: {
  paymentId: string;
  communitySlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { slug: input.communitySlug },
    select: { id: true, ownerId: true },
  });
  if (!community || community.ownerId !== s.user.id) return { ok: false, reason: "unauthorized" };

  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) return { ok: false, reason: "not_found" };
  if (payment.communityId !== community.id) return { ok: false, reason: "unauthorized" };
  if (payment.status !== "PENDING") return { ok: false, reason: "already_processed" };

  const manualRef = `MANUAL-${Date.now()}`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED", receivedAt: new Date(), transactionId: manualRef },
      });

      if (payment.refType === "challenge") {
        const member = await tx.challengeMember.findUnique({
          where: { id: payment.refId },
          select: { challengeId: true },
        });
        if (member) {
          await tx.challengeMember.update({
            where: { id: payment.refId },
            data: {
              status: "ACTIVE",
              approvedAt: new Date(),
              personalStartsAt: new Date(),
            },
          });
        }
      } else if (payment.refType === "subscription") {
        await tx.subscription.updateMany({
          where: { id: payment.refId },
          data: { status: "ACTIVE", paymentRef: manualRef, startedAt: new Date() },
        });
      }
    });
  } catch (err) {
    logError(err, { paymentId: payment.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }

  logger.info({ paymentId: payment.id, refType: payment.refType, adminId: s.user.id }, "[orders] payment manually approved");
  revalidatePath(`/c/${input.communitySlug}/orders`);
  return { ok: true };
}
