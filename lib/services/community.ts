/**
 * Community service — centralized community / membership logic.
 * Pages/actions should call these instead of Prisma directly.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getClasses } from "@/lib/community-config";

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
 * owner's Membership in the same transaction and bumps memberCount.
 */
export async function createCommunity(input: {
  userId: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
}) {
  // Slug format already validated upstream by Zod. Here we check uniqueness.
  const existing = await prisma.community.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Slug "${input.slug}" đã có cộng đồng khác dùng rồi`);
  }

  return await prisma.$transaction(async (tx) => {
    const community = await tx.community.create({
      data: {
        name: input.name,
        slug: input.slug,
        tagline: input.tagline?.trim() || null,
        description: input.description?.trim() || null,
        ownerId: input.userId,
        memberCount: 1,
      },
    });
    await tx.membership.create({
      data: {
        userId: input.userId,
        communityId: community.id,
        role: "ADMIN",
        tier: "OWNER",
      },
    });
    logger.info(
      { communityId: community.id, slug: community.slug, userId: input.userId },
      "[community] created"
    );
    return community;
  });
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
