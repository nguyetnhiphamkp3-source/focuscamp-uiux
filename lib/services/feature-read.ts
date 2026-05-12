import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const FEATURE_READ_KEYS = ["feed", "qa", "signals", "cot"] as const;
export type FeatureReadKey = (typeof FEATURE_READ_KEYS)[number];

export function isFeatureReadKey(value: string): value is FeatureReadKey {
  return (FEATURE_READ_KEYS as readonly string[]).includes(value);
}

function postWhereForFeature(
  featureKey: FeatureReadKey,
  since: Date,
  userId: string,
  communityId: string
): Prisma.PostWhereInput {
  const base: Prisma.PostWhereInput = {
    communityId,
    userId: { not: userId },
  };

  if (featureKey === "qa") {
    return { ...base, type: "QUESTION", createdAt: { gt: since } };
  }
  if (featureKey === "signals") {
    return { ...base, type: "SIGNAL", createdAt: { gt: since } };
  }
  if (featureKey === "cot") {
    return {
      ...base,
      type: "POST",
      isCot: true,
      OR: [
        { cotApprovedAt: { gt: since } },
        { cotApprovedAt: null, createdAt: { gt: since } },
      ],
    };
  }

  return { ...base, type: "POST", createdAt: { gt: since } };
}

export async function markFeatureViewed(input: {
  userId: string;
  communityId: string;
  featureKey: FeatureReadKey;
}) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: input.communityId,
      },
    },
    select: { id: true },
  });
  if (!membership) return;

  await prisma.featureReadState.upsert({
    where: {
      userId_communityId_featureKey: {
        userId: input.userId,
        communityId: input.communityId,
        featureKey: input.featureKey,
      },
    },
    update: { lastViewedAt: new Date() },
    create: {
      userId: input.userId,
      communityId: input.communityId,
      featureKey: input.featureKey,
    },
  });
}

export async function getFeatureUnreadCount(input: {
  userId: string;
  communityId: string;
  featureKey: FeatureReadKey;
}) {
  const [state, membership] = await Promise.all([
    prisma.featureReadState.findUnique({
      where: {
        userId_communityId_featureKey: {
          userId: input.userId,
          communityId: input.communityId,
          featureKey: input.featureKey,
        },
      },
      select: { lastViewedAt: true },
    }),
    prisma.membership.findUnique({
      where: {
        userId_communityId: {
          userId: input.userId,
          communityId: input.communityId,
        },
      },
      select: { joinedAt: true },
    }),
  ]);

  if (!membership) return 0;

  const since = state?.lastViewedAt ?? membership.joinedAt;
  return prisma.post.count({
    where: postWhereForFeature(
      input.featureKey,
      since,
      input.userId,
      input.communityId
    ),
  });
}
