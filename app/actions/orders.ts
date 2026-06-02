"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logError, logger } from "@/lib/logger";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";
import { isSuperAdmin } from "@/lib/platform-admin";
import { activateCommunityPlan } from "@/lib/services/community";
import { fulfillBumpInTx } from "@/lib/services/payment";

type ActionResult = { ok: true } | { ok: false; reason: string };

export async function approveOrderAction(input: {
  purchaseId: string;
  communitySlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const adminId = s.user.id;

  const purchase = await prisma.purchase.findUnique({
    where: { id: input.purchaseId },
    select: {
      id: true,
      status: true,
      product: {
        select: {
          communityId: true,
          title: true,
          community: {
            select: {
              ownerId: true,
              memberships: { where: { userId: s.user.id }, select: { role: true } },
            },
          },
        },
      },
      user: { select: { name: true, email: true } },
      userId: true,
      amountVnd: true,
    },
  });

  if (!purchase) return { ok: false, reason: "not_found" };
  const role = effectiveCommunityRole({
    isOwner: purchase.product.community.ownerId === s.user.id,
    membershipRole: purchase.product.community.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_orders")) return { ok: false, reason: "unauthorized" };
  if (purchase.status !== "PENDING") return { ok: false, reason: "already_processed" };

  const manualRef = `MANUAL-${Date.now()}`;

  // Load the pending product payment so commission is computed on the NET
  // (post-coupon) amount and any order bump is fulfilled — mirroring the SePay
  // webhook path (payment.ts). Without this, coupon orders overpay the affiliate
  // (gross Purchase.amountVnd) and bump products are never fulfilled.
  const payment = await prisma.payment.findFirst({
    where: { refType: "product", refId: purchase.id, status: "PENDING" },
    select: { id: true, amountVnd: true, metadata: true, userId: true },
  });
  const meta = (payment?.metadata ?? {}) as Record<string, unknown>;
  const productCommissionSources: Array<{ purchaseId: string; amountVnd?: number }> = [];

  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "COMPLETED", paymentRef: manualRef },
      });
      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            receivedAt: new Date(),
            transactionId: manualRef,
            // Persist who approved manually (survives log rotation, unlike pino logs).
            metadata: {
              ...meta,
              approvalSource: "MANUAL",
              approvedBy: adminId,
              approvedAt: new Date().toISOString(),
            },
          },
        });
        const bumpPrice = Number(meta.bumpPriceVnd ?? 0);
        const mainAmount = Number(payment.amountVnd) - (Number.isFinite(bumpPrice) ? bumpPrice : 0);
        productCommissionSources.push({ purchaseId: purchase.id, amountVnd: Math.max(0, mainAmount) });
        if (meta.bumpProductId && !meta.bumpFulfilled) {
          const bump = await fulfillBumpInTx(tx, {
            userId: payment.userId,
            paymentId: payment.id,
            bumpProductId: String(meta.bumpProductId),
            bumpPriceVnd: Number(meta.bumpPriceVnd ?? 0),
            transactionId: manualRef,
            meta,
          });
          if (bump.purchaseId) {
            productCommissionSources.push({
              purchaseId: bump.purchaseId,
              amountVnd: Number(meta.bumpPriceVnd ?? 0),
            });
          }
        }
      } else {
        // No payment row (edge case): complete any stray pending payment and fall
        // back to the purchase's own amount for commission (no bump info available).
        await tx.payment.updateMany({
          where: { refType: "product", refId: purchase.id, status: "PENDING" },
          data: {
            status: "COMPLETED",
            receivedAt: new Date(),
            transactionId: manualRef,
            metadata: { approvalSource: "MANUAL", approvedBy: adminId, approvedAt: new Date().toISOString() },
          },
        });
        productCommissionSources.push({ purchaseId: purchase.id });
      }

      // Affiliate commission MUST be atomic with completion (H1) — write inside
      // this txn; errors roll the approval back, idempotency key makes retries safe.
      const { convertReferralFromPurchase } = await import("@/lib/services/affiliate");
      for (const source of productCommissionSources) {
        await convertReferralFromPurchase(
          source.purchaseId,
          purchase.userId,
          { amountVnd: source.amountVnd },
          tx,
        );
      }
    });
  } catch (err) {
    logError(err, { purchaseId: purchase.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }

  // Assign license key for main purchase (+ bump if fulfilled)
  try {
    const { assignLicenseKey } = await import("@/lib/services/license");
    await assignLicenseKey(purchase.id);
  } catch (err) {
    logger.warn({ err, purchaseId: purchase.id }, "[orders] manual approve: license assign failed");
  }
  if (meta.bumpProductId) {
    try {
      const bumpPurchase = await prisma.purchase.findFirst({
        where: { userId: purchase.userId, productId: String(meta.bumpProductId), status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (bumpPurchase) {
        const { assignLicenseKey } = await import("@/lib/services/license");
        await assignLicenseKey(bumpPurchase.id);
      }
    } catch {
      /* non-critical */
    }
  }

  // Send notification
  try {
    const { dispatchToChannels } = await import("@/lib/services/external-notify");
    const buyerName = purchase.user.name ?? purchase.user.email?.split("@")[0] ?? "Khách";
    const amountStr = Number(purchase.amountVnd).toLocaleString("vi-VN");
    await dispatchToChannels(
      purchase.product.communityId,
      "purchase_completed",
      {
        title: `💰 Duyệt thủ công: ${purchase.product.title}`,
        description: `${buyerName} · ${amountStr}đ`,
      },
      { product: purchase.product.title, buyer: buyerName, amount: amountStr },
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
  const adminId = s.user.id;

  const community = await prisma.community.findUnique({
    where: { slug: input.communitySlug },
    select: {
      id: true,
      ownerId: true,
      memberships: { where: { userId: s.user.id }, select: { role: true } },
    },
  });
  if (!community) return { ok: false, reason: "unauthorized" };
  const role = effectiveCommunityRole({
    isOwner: community.ownerId === s.user.id,
    membershipRole: community.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_orders")) return { ok: false, reason: "unauthorized" };

  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) return { ok: false, reason: "not_found" };
  if (payment.communityId !== community.id) return { ok: false, reason: "unauthorized" };
  if (payment.status !== "PENDING") return { ok: false, reason: "already_processed" };
  if (payment.refType === "community" || payment.purpose === "community_plan") {
    return { ok: false, reason: "platform_order_requires_super_admin" };
  }

  const manualRef = `MANUAL-${Date.now()}`;
  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  const productCommissionSources: Array<{ purchaseId: string; amountVnd?: number }> = [];

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          receivedAt: new Date(),
          transactionId: manualRef,
          // Persist who approved manually (survives log rotation, unlike pino logs).
          metadata: {
            ...meta,
            approvalSource: "MANUAL",
            approvedBy: adminId,
            approvedAt: new Date().toISOString(),
          },
        },
      });

      if (payment.refType === "challenge") {
        // Activate the member; start timing is controlled by Challenge.autoStartAfterHours.
        await tx.challengeMember.update({
          where: { id: payment.refId },
          data: { status: "ACTIVE", approvedAt: new Date() },
        });
        if (meta.bumpProductId && !meta.bumpFulfilled) {
          const bump = await fulfillBumpInTx(tx, {
            userId: payment.userId,
            paymentId: payment.id,
            bumpProductId: String(meta.bumpProductId),
            bumpPriceVnd: Number(meta.bumpPriceVnd ?? 0),
            transactionId: manualRef,
            meta,
          });
          if (bump.purchaseId) {
            productCommissionSources.push({
              purchaseId: bump.purchaseId,
              amountVnd: Number(meta.bumpPriceVnd ?? 0),
            });
          }
        }
      } else if (payment.refType === "subscription") {
        const subscription = await tx.subscription.findUnique({
          where: { id: payment.refId },
          select: { userId: true, communityId: true },
        });
        await tx.subscription.updateMany({
          where: { id: payment.refId },
          data: { status: "ACTIVE", paymentRef: manualRef, startedAt: new Date() },
        });
        if (subscription) {
          // Ensure Membership exists so user can access the community.
          // Bump memberCount only when newly created.
          const existing = await tx.membership.findUnique({
            where: {
              userId_communityId: {
                userId: subscription.userId,
                communityId: subscription.communityId,
              },
            },
            select: { id: true },
          });
          if (!existing) {
            await tx.membership.create({
              data: {
                userId: subscription.userId,
                communityId: subscription.communityId,
                role: "MEMBER",
              },
            });
            await tx.community.update({
              where: { id: subscription.communityId },
              data: { memberCount: { increment: 1 } },
            });
          }
        }
      }

      // Affiliate commission MUST be atomic with completion (H1) — write inside
      // this txn; errors roll the approval back, idempotency key makes retries safe.
      if (payment.refType === "challenge") {
        const { convertReferralFromPurchase, convertReferralFromChallengePayment } =
          await import("@/lib/services/affiliate");
        for (const source of productCommissionSources) {
          await convertReferralFromPurchase(
            source.purchaseId,
            payment.userId,
            { amountVnd: source.amountVnd },
            tx,
          );
        }
        await convertReferralFromChallengePayment(payment.id, payment.userId, tx);
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

export async function approvePlatformPaymentAction(input: {
  paymentId: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  if (!(await isSuperAdmin(s.user.id))) return { ok: false, reason: "unauthorized" };

  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) return { ok: false, reason: "not_found" };
  if (payment.status !== "PENDING") return { ok: false, reason: "already_processed" };
  if (payment.purpose !== "community_plan" || payment.refType !== "community") {
    return { ok: false, reason: "not_platform_order" };
  }

  const manualRef = `MANUAL-${Date.now()}`;
  const meta = (payment.metadata ?? {}) as Record<string, unknown>;

  try {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        receivedAt: new Date(),
        transactionId: manualRef,
        // Persist who approved manually (survives log rotation, unlike pino logs).
        metadata: {
          ...meta,
          approvalSource: "MANUAL",
          approvedBy: s.user.id,
          approvedAt: new Date().toISOString(),
        },
      },
    });
    await activateCommunityPlan(payment.refId, {
      paymentCode: payment.paymentCode,
      transactionId: manualRef,
      amountVnd: Number(payment.amountVnd),
    });
  } catch (err) {
    logError(err, { paymentId: payment.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }

  logger.info(
    { paymentId: payment.id, communityId: payment.refId, adminId: s.user.id },
    "[orders] platform payment manually approved",
  );
  revalidatePath("/admin/orders");
  return { ok: true };
}

/**
 * Hard-delete an EXPIRED order and the dangling records it spawned.
 * Only touches not-yet-completed siblings (PENDING purchase / PAYMENT_PENDING
 * member / PENDING subscription) so nothing live is removed.
 */
export async function deleteExpiredOrderAction(input: {
  paymentId: string;
  communitySlug: string;
  mode?: "community" | "platform";
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) return { ok: false, reason: "not_found" };
  if (payment.status !== "EXPIRED") return { ok: false, reason: "not_expired" };

  // Authorize: platform orders need super admin; community orders need manage_orders.
  if (input.mode === "platform" || payment.purpose === "community_plan") {
    if (!(await isSuperAdmin(s.user.id))) return { ok: false, reason: "unauthorized" };
  } else {
    const community = await prisma.community.findUnique({
      where: { slug: input.communitySlug },
      select: {
        id: true,
        ownerId: true,
        memberships: { where: { userId: s.user.id }, select: { role: true } },
      },
    });
    if (!community || community.id !== payment.communityId) return { ok: false, reason: "unauthorized" };
    const role = effectiveCommunityRole({
      isOwner: community.ownerId === s.user.id,
      membershipRole: community.memberships[0]?.role,
    });
    if (!canCommunity(role, "manage_orders")) return { ok: false, reason: "unauthorized" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // CouponRedemption has a non-cascading FK to Payment — remove it first.
      await tx.couponRedemption.deleteMany({ where: { paymentId: payment.id } });
      if (payment.refType === "product") {
        await tx.purchase.deleteMany({ where: { id: payment.refId, status: "PENDING" } });
      } else if (payment.refType === "challenge") {
        await tx.challengeMember.deleteMany({
          where: { id: payment.refId, status: { in: ["PAYMENT_PENDING", "PENDING"] } },
        });
      } else if (payment.refType === "subscription") {
        await tx.subscription.deleteMany({ where: { id: payment.refId, status: "PENDING" } });
      }
      await tx.payment.delete({ where: { id: payment.id } });
    });
  } catch (err) {
    logError(err, { paymentId: payment.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }

  logger.info({ paymentId: payment.id, refType: payment.refType, adminId: s.user.id }, "[orders] expired order deleted");
  revalidatePath(input.mode === "platform" ? "/admin/orders" : `/c/${input.communitySlug}/orders`);
  return { ok: true };
}

/**
 * Soft-cancel a PENDING order. The Payment row is kept for audit, while the
 * not-yet-activated child record is marked CANCELLED so the buyer no longer
 * sits in a pending access state.
 */
export async function cancelPendingOrderAction(input: {
  paymentId: string;
  communitySlug: string;
  mode?: "community" | "platform";
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const adminId = s.user.id;

  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) return { ok: false, reason: "not_found" };
  if (payment.status !== "PENDING") return { ok: false, reason: "already_processed" };

  if (input.mode === "platform") {
    if (payment.purpose !== "community_plan" || payment.refType !== "community") {
      return { ok: false, reason: "not_platform_order" };
    }
    if (!(await isSuperAdmin(adminId))) return { ok: false, reason: "unauthorized" };
  } else if (payment.purpose === "community_plan") {
    if (!(await isSuperAdmin(adminId))) return { ok: false, reason: "unauthorized" };
  } else {
    const community = await prisma.community.findUnique({
      where: { slug: input.communitySlug },
      select: {
        id: true,
        ownerId: true,
        memberships: { where: { userId: adminId }, select: { role: true } },
      },
    });
    if (!community || community.id !== payment.communityId) return { ok: false, reason: "unauthorized" };
    const role = effectiveCommunityRole({
      isOwner: community.ownerId === adminId,
      membershipRole: community.memberships[0]?.role,
    });
    if (!canCommunity(role, "manage_orders")) return { ok: false, reason: "unauthorized" };
  }

  const now = new Date();
  const meta = (payment.metadata ?? {}) as Record<string, unknown>;

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: {
          status: "CANCELLED",
          metadata: {
            ...meta,
            cancellationSource: "MANUAL",
            cancelledBy: adminId,
            cancelledAt: now.toISOString(),
          },
        },
      });
      if (updated.count === 0) throw new Error("already_processed");

      await tx.couponRedemption.updateMany({
        where: { paymentId: payment.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      if (payment.refType === "product") {
        await tx.purchase.updateMany({
          where: { id: payment.refId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
      } else if (payment.refType === "challenge") {
        await tx.challengeMember.updateMany({
          where: { id: payment.refId, status: { in: ["PAYMENT_PENDING", "PENDING"] } },
          data: { status: "CANCELLED" },
        });
      } else if (payment.refType === "subscription") {
        await tx.subscription.updateMany({
          where: { id: payment.refId, status: "PENDING" },
          data: { status: "CANCELLED", cancelledAt: now },
        });
      } else if (payment.refType === "event") {
        await tx.eventBooking.updateMany({
          where: { id: payment.refId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
      }
    });
  } catch (err) {
    logError(err, { paymentId: payment.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }

  logger.info(
    { paymentId: payment.id, refType: payment.refType, adminId },
    "[orders] payment manually cancelled",
  );
  revalidatePath(input.mode === "platform" ? "/admin/orders" : `/c/${input.communitySlug}/orders`);
  return { ok: true };
}
