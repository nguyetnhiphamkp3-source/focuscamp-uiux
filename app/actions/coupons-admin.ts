"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  effectiveCommunityRole,
  canCommunity,
} from "@/lib/community-permissions";
import { CreateCouponSchema, UpdateCouponSchema } from "@/lib/validations";

async function requireCouponManager(communityId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!community) throw new Error("community_not_found");
  const isOwner = community.ownerId === session.user.id;
  const membership = isOwner
    ? null
    : await prisma.membership.findUnique({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId,
          },
        },
        select: { role: true },
      });
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: membership?.role,
  });
  if (!canCommunity(role, "manage_coupons")) throw new Error("forbidden");
  return { userId: session.user.id };
}

async function normalizeAllowedMemberIds(communityId: string, rawIds: string[]) {
  const ids = Array.from(new Set(rawIds));
  if (ids.length === 0) return ids;

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  const memberships = await prisma.membership.findMany({
    where: { communityId, userId: { in: ids } },
    select: { userId: true },
  });
  const allowed = new Set([community?.ownerId, ...memberships.map((m) => m.userId)].filter(Boolean));
  return ids.every((id) => allowed.has(id)) ? ids : null;
}

export async function createCouponAction(input: {
  communityId: string;
  data: unknown;
}): Promise<{ ok: true; couponId: string } | { ok: false; reason: string }> {
  try {
    await requireCouponManager(input.communityId);
    const parsed = CreateCouponSchema.safeParse(input.data);
    if (!parsed.success) {
      return {
        ok: false,
        reason: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };
    }
    const allowedMemberIds = await normalizeAllowedMemberIds(
      input.communityId,
      parsed.data.allowedMemberIds,
    );
    if (!allowedMemberIds) {
      return { ok: false, reason: "Thành viên được chọn không thuộc community này" };
    }
    const coupon = await prisma.coupon.create({
      data: {
        communityId: input.communityId,
        code: parsed.data.code,
        discountType: parsed.data.discountType,
        percentageBps: parsed.data.percentageBps ?? null,
        maxDiscountVnd: parsed.data.maxDiscountVnd ?? null,
        fixedAmountVnd: parsed.data.fixedAmountVnd ?? null,
        minOrderVnd: parsed.data.minOrderVnd ?? null,
        validFrom: parsed.data.validFrom ?? null,
        validUntil: parsed.data.validUntil ?? null,
        maxRedemptions: parsed.data.maxRedemptions ?? null,
        perUserLimit: parsed.data.perUserLimit,
        allowedRefTypes: parsed.data.allowedRefTypes,
        allowedProductIds: parsed.data.allowedProductIds,
        allowedChallengeIds: parsed.data.allowedChallengeIds,
        allowedMemberIds,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath(`/c/${input.communityId}/settings/coupons`);
    return { ok: true, couponId: coupon.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg.includes("Unique constraint")) {
      return { ok: false, reason: "Mã coupon đã tồn tại trong community này" };
    }
    return { ok: false, reason: msg };
  }
}

export async function updateCouponAction(input: {
  communityId: string;
  couponId: string;
  data: unknown;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await requireCouponManager(input.communityId);
    const parsed = UpdateCouponSchema.safeParse(input.data);
    if (!parsed.success) {
      return {
        ok: false,
        reason: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };
    }
    const allowedMemberIds =
      parsed.data.allowedMemberIds === undefined
        ? undefined
        : await normalizeAllowedMemberIds(input.communityId, parsed.data.allowedMemberIds);
    if (allowedMemberIds === null) {
      return { ok: false, reason: "Thành viên được chọn không thuộc community này" };
    }
    await prisma.coupon.update({
      where: { id: input.couponId, communityId: input.communityId },
      data: {
        ...(parsed.data.code !== undefined && { code: parsed.data.code }),
        ...(parsed.data.discountType !== undefined && { discountType: parsed.data.discountType }),
        ...(parsed.data.percentageBps !== undefined && { percentageBps: parsed.data.percentageBps }),
        ...(parsed.data.maxDiscountVnd !== undefined && { maxDiscountVnd: parsed.data.maxDiscountVnd }),
        ...(parsed.data.fixedAmountVnd !== undefined && { fixedAmountVnd: parsed.data.fixedAmountVnd }),
        ...(parsed.data.minOrderVnd !== undefined && { minOrderVnd: parsed.data.minOrderVnd }),
        ...(parsed.data.validFrom !== undefined && { validFrom: parsed.data.validFrom }),
        ...(parsed.data.validUntil !== undefined && { validUntil: parsed.data.validUntil }),
        ...(parsed.data.maxRedemptions !== undefined && { maxRedemptions: parsed.data.maxRedemptions }),
        ...(parsed.data.perUserLimit !== undefined && { perUserLimit: parsed.data.perUserLimit }),
        ...(parsed.data.allowedRefTypes !== undefined && { allowedRefTypes: parsed.data.allowedRefTypes }),
        ...(parsed.data.allowedProductIds !== undefined && { allowedProductIds: parsed.data.allowedProductIds }),
        ...(parsed.data.allowedChallengeIds !== undefined && { allowedChallengeIds: parsed.data.allowedChallengeIds }),
        ...(allowedMemberIds !== undefined && { allowedMemberIds }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
    });
    revalidatePath(`/c/${input.communityId}/settings/coupons`);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

export async function toggleCouponActiveAction(input: {
  communityId: string;
  couponId: string;
  isActive: boolean;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await requireCouponManager(input.communityId);
    await prisma.coupon.update({
      where: { id: input.couponId, communityId: input.communityId },
      data: { isActive: input.isActive },
    });
    revalidatePath(`/c/${input.communityId}/settings/coupons`);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

export async function deleteCouponAction(input: {
  communityId: string;
  couponId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await requireCouponManager(input.communityId);
    const redemptions = await prisma.couponRedemption.count({
      where: { couponId: input.couponId },
    });
    if (redemptions > 0) {
      return {
        ok: false,
        reason: "Coupon đã có người dùng — chỉ có thể tắt (isActive=false)",
      };
    }
    await prisma.coupon.delete({
      where: { id: input.couponId, communityId: input.communityId },
    });
    revalidatePath(`/c/${input.communityId}/settings/coupons`);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
