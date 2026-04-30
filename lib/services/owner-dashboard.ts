/**
 * Aggregated stats for community owner across ALL their owned communities.
 * Returns one row per community with member count, MRR (sum active subs), recent
 * revenue (30d), plan status, etc.
 */
import { prisma } from "@/lib/prisma";
import { getPlanStatus, planLabel, type PlanState } from "@/lib/platform-plans";

export interface OwnerCommunityRow {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  postCount30d: number;
  checkinCount30d: number;
  revenueVnd30d: number;
  mrrVnd: number;
  planLabel: string;
  planState: PlanState;
}

export async function getOwnerOverview(userId: string): Promise<OwnerCommunityRow[]> {
  const communities = await prisma.community.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      iconUrl: true,
      memberCount: true,
      planTier: true,
      planExpiresAt: true,
    },
  });
  if (communities.length === 0) return [];

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const rows = await Promise.all(
    communities.map(async (c) => {
      const [posts, checkins, payments, subs] = await Promise.all([
        prisma.post.count({
          where: { communityId: c.id, createdAt: { gte: since } },
        }),
        prisma.checkin.count({
          where: { challenge: { communityId: c.id }, createdAt: { gte: since } },
        }),
        prisma.payment.aggregate({
          where: {
            communityId: c.id,
            status: "COMPLETED",
            receivedAt: { gte: since },
          },
          _sum: { amountVnd: true },
        }),
        prisma.subscription.aggregate({
          where: {
            communityId: c.id,
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          _sum: { amountVnd: true },
        }),
      ]);
      const planState = getPlanStatus(c);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        iconUrl: c.iconUrl,
        memberCount: c.memberCount,
        postCount30d: posts,
        checkinCount30d: checkins,
        revenueVnd30d: Number(payments._sum.amountVnd ?? 0),
        mrrVnd: Number(subs._sum.amountVnd ?? 0),
        planLabel: planLabel(planState.tier),
        planState,
      };
    })
  );
  return rows;
}
