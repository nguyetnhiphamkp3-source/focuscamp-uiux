/**
 * Community service — centralized community / membership logic.
 * Pages/actions should call these instead of Prisma directly.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getClasses } from "@/lib/community-config";
import {
  PLATFORM_PLANS,
  extendExpiry,
  getPlanStatus,
  canWrite,
  type PlanTier,
} from "@/lib/platform-plans";
import { createPayment } from "@/lib/sepay";

/**
 * Assert the community plan allows writing (post, challenge, course, etc).
 * Throws a translated error if the plan is expired or pending.
 */
export async function assertCommunityCanWrite(communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { planTier: true, planExpiresAt: true },
  });
  if (!c) throw new Error("community_not_found");
  const state = getPlanStatus(c);
  if (!canWrite(state)) {
    if (state.status === "pending") {
      throw new Error("Cộng đồng chưa kích hoạt — owner cần thanh toán gói");
    }
    if (state.status === "expired") {
      throw new Error("Gói đã hết hạn — owner cần gia hạn để tiếp tục");
    }
  }
}

export async function getCommunityBySlug(slug: string) {
  return prisma.community.findUnique({ where: { slug } });
}

export async function getMembership(userId: string, communityId: string) {
  return prisma.membership.findUnique({
    where: { userId_communityId: { userId, communityId } },
  });
}

/**
 * Join user to community (idempotent). Wraps membership.create + community.memberCount
 * in a transaction so counters never drift.
 *
 * If the community has `classesConfig` and `className` is provided + valid,
 * stores it on the membership. Invalid class keys are silently dropped (no join
 * failure) so a stale client can't block joining.
 */
export async function joinCommunity(
  userId: string,
  communityId: string,
  className?: string
) {
  try {
    // Validate className against community's configured classes (if any)
    let validatedClass: string | null = null;
    if (className) {
      const community = await prisma.community.findUnique({
        where: { id: communityId },
        select: { classesConfig: true },
      });
      if (community) {
        const keys = new Set(getClasses(community).map((c) => c.key));
        if (keys.has(className)) validatedClass = className;
      }
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: { userId_communityId: { userId, communityId } },
      });
      if (existing) {
        // Already a member — let them set/change class on re-join click
        if (validatedClass && existing.className !== validatedClass) {
          const updated = await tx.membership.update({
            where: { id: existing.id },
            data: { className: validatedClass },
          });
          return { created: false, membership: updated };
        }
        return { created: false, membership: existing };
      }

      const membership = await tx.membership.create({
        data: {
          userId,
          communityId,
          role: "MEMBER",
          tier: "EXPLORER",
          className: validatedClass,
        },
      });
      await tx.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } },
      });
      // External channel notification (Discord/Telegram) — non-blocking
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      const displayName = u?.name || u?.email?.split("@")[0] || "Thành viên mới";
      void import("./external-notify").then((m) =>
        m.dispatchToChannels(communityId, "new_member", {
          title: `🎉 ${displayName} vừa join cộng đồng`,
          description: `Welcome ${displayName}!`,
        }).catch(() => {})
      );
      return { created: true, membership };
    });
  } catch (err) {
    // Handle race condition where unique constraint fires
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const membership = await prisma.membership.findUnique({
        where: { userId_communityId: { userId, communityId } },
      });
      if (membership) return { created: false, membership };
    }
    logger.error({ err, userId, communityId }, "[community] joinCommunity failed");
    throw err;
  }
}

/**
 * Create a new community with the current user as owner. Creates the
 * owner's Membership + a PENDING Payment for the chosen plan in the same
 * flow. Community is created with planExpiresAt = null (PENDING).
 *
 * Returns { community, paymentCode } so the caller can redirect to /pay/<code>.
 */
export async function createCommunity(input: {
  userId: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  category?: string | null;
  planTier: PlanTier;
}) {
  // Slug format already validated upstream by Zod. Here we check uniqueness.
  const existing = await prisma.community.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Slug "${input.slug}" đã có cộng đồng khác dùng rồi`);
  }

  const tier = input.planTier;
  if (tier === "GRANDFATHER") {
    throw new Error("Không thể tạo community với GRANDFATHER tier");
  }
  const plan = PLATFORM_PLANS[tier];

  const community = await prisma.$transaction(async (tx) => {
    const c = await tx.community.create({
      data: {
        name: input.name,
        slug: input.slug,
        tagline: input.tagline?.trim() || null,
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        ownerId: input.userId,
        memberCount: 1,
        planTier: tier,
        planExpiresAt: null, // PENDING until payment matches
      },
    });
    await tx.membership.create({
      data: {
        userId: input.userId,
        communityId: c.id,
        role: "ADMIN",
        tier: "OWNER",
      },
    });
    logger.info(
      { communityId: c.id, slug: c.slug, userId: input.userId, planTier: tier },
      "[community] created (pending payment)"
    );
    return c;
  });

  // Create a Payment row + return code for SePay QR. Outside the txn
  // because createPayment loops on uniqueness and is safe to retry.
  const payment = await createPayment({
    userId: input.userId,
    communityId: community.id,
    purpose: "community_plan",
    refType: "community",
    refId: community.id,
    amountVnd: plan.priceVnd,
  });

  return { community, paymentCode: payment.paymentCode };
}

/**
 * Renew an existing community plan — creates a new PENDING Payment.
 * On match, payment service extends planExpiresAt by 30 days.
 */
export async function renewCommunityPlan(input: {
  userId: string;
  communityId: string;
}) {
  const c = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { id: true, ownerId: true, planTier: true, slug: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== input.userId) {
    throw new Error("Chỉ chủ cộng đồng mới gia hạn được");
  }
  const tier = (c.planTier || "SOLO") as PlanTier;
  if (tier === "GRANDFATHER") {
    throw new Error("Cộng đồng grandfather, không cần gia hạn");
  }
  const plan = PLATFORM_PLANS[tier];
  const payment = await createPayment({
    userId: input.userId,
    communityId: c.id,
    purpose: "community_plan",
    refType: "community",
    refId: c.id,
    amountVnd: plan.priceVnd,
  });
  logger.info(
    { communityId: c.id, userId: input.userId, paymentCode: payment.paymentCode },
    "[community] renewal payment created"
  );
  return { paymentCode: payment.paymentCode, slug: c.slug };
}

/**
 * Apply a successful community_plan payment — extend expiry by 30 days from
 * current expiry (or now if expired/null). Called by payment webhook matcher.
 * Also triggers the receipt email for the owner.
 */
export async function activateCommunityPlan(
  communityId: string,
  paymentMeta?: {
    paymentCode: string;
    transactionId: string;
    amountVnd: number;
  }
) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      planExpiresAt: true,
      planTier: true,
      name: true,
      owner: { select: { email: true } },
    },
  });
  if (!c) throw new Error("community_not_found");
  const newExpiry = extendExpiry(c.planExpiresAt);
  await prisma.community.update({
    where: { id: communityId },
    data: { planExpiresAt: newExpiry },
  });
  logger.info(
    { communityId, newExpiry },
    "[community] plan activated/extended"
  );

  // Receipt email (best-effort)
  if (paymentMeta && c.owner?.email) {
    try {
      const { sendEmail } = await import("@/lib/email");
      const { paymentReceiptEmail } = await import("@/lib/email-templates");
      await sendEmail({
        to: c.owner.email,
        ...paymentReceiptEmail({
          amountVnd: paymentMeta.amountVnd,
          communityName: c.name,
          planTier: (c.planTier || "SOLO") as PlanTier,
          expiresAt: newExpiry,
          paymentCode: paymentMeta.paymentCode,
          transactionId: paymentMeta.transactionId,
        }),
      });
    } catch (err) {
      logger.warn({ err, communityId }, "[community] receipt email failed");
    }
  }

  return newExpiry;
}

/**
 * Update community metadata. Owner only. Cannot change slug or ownerId
 * here — slug change is risky (breaks URLs) and ownership transfer is
 * a separate ceremony.
 */
export async function updateCommunityInfo(input: {
  userId: string;
  communityId: string;
  name?: string;
  tagline?: string;
  description?: string;
  category?: string | null;
  featuredOnGlobal?: boolean;
  bannerUrl?: string;
  iconUrl?: string;
}) {
  const c = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== input.userId)
    throw new Error("Chỉ chủ cộng đồng mới sửa được thông tin");

  await prisma.community.update({
    where: { id: input.communityId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.tagline !== undefined
        ? { tagline: input.tagline.trim() || null }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
      ...(input.category !== undefined
        ? { category: input.category?.trim() || null }
        : {}),
      ...(input.featuredOnGlobal !== undefined
        ? { featuredOnGlobal: input.featuredOnGlobal }
        : {}),
      ...(input.bannerUrl !== undefined
        ? { bannerUrl: input.bannerUrl.trim() || null }
        : {}),
      ...(input.iconUrl !== undefined
        ? { iconUrl: input.iconUrl.trim() || null }
        : {}),
    },
  });
  logger.info(
    { communityId: input.communityId, by: input.userId },
    "[community] info updated"
  );
}

export async function listMyCommunities(userId: string) {
  const mems = await prisma.membership.findMany({
    where: { userId },
    include: { community: { select: { id: true, slug: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return mems.map((m) => m.community);
}
