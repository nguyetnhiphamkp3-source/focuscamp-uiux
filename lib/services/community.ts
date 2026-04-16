/**
 * Community service — centralized community / membership logic.
 * Pages/actions should call these instead of Prisma directly.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

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
 */
export async function joinCommunity(userId: string, communityId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: { userId_communityId: { userId, communityId } },
      });
      if (existing) return { created: false, membership: existing };

      const membership = await tx.membership.create({
        data: {
          userId,
          communityId,
          role: "MEMBER",
          tier: "EXPLORER",
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

export async function listMyCommunities(userId: string) {
  const mems = await prisma.membership.findMany({
    where: { userId },
    include: { community: { select: { id: true, slug: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return mems.map((m) => m.community);
}
