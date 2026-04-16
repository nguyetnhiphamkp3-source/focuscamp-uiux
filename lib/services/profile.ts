/**
 * Profile service — fetch public profile data for a user in the context of
 * a specific community. Centralizes the JOIN between User + Membership +
 * recent Posts + activity metrics so the detail page + self profile + any
 * future sidebar can share the same query.
 */
import { prisma } from "@/lib/prisma";

export type ProfileData = Awaited<ReturnType<typeof getCommunityProfile>>;

export type HeatmapDay = { date: string; count: number };

export async function getCommunityProfile(input: {
  userId: string;
  communityId: string;
  postsLimit?: number;
}) {
  const { userId, communityId, postsLimit = 10 } = input;

  const heatmapStart = new Date();
  heatmapStart.setDate(heatmapStart.getDate() - 364);
  heatmapStart.setHours(0, 0, 0, 0);

  const [
    user,
    membership,
    posts,
    postCount,
    commentCount,
    checkinCount,
    otherMemberships,
    ownedCommunities,
    latestActivity,
    heatmapPosts,
    heatmapComments,
    heatmapCheckins,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        handle: true,
        bio: true,
        location: true,
        createdAt: true,
      },
    }),
    prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId } },
    }),
    prisma.post.findMany({
      where: { userId, communityId },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        pillar: true,
        isCot: true,
        createdAt: true,
        _count: { select: { comments: true, reactions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: postsLimit,
    }),
    prisma.post.count({ where: { userId, communityId } }),
    prisma.comment.count({
      where: { userId, post: { communityId } },
    }),
    // Checkins belong to Challenge, Challenge has communityId — JOIN via relation
    prisma.checkin.count({
      where: { userId, challenge: { communityId } },
    }),
    // "Also active in" — other communities this user belongs to
    prisma.membership.findMany({
      where: { userId, NOT: { communityId } },
      include: {
        community: {
          select: { id: true, slug: true, name: true, iconUrl: true },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 12,
    }),
    // Owned communities — badge signal (cross-community, but public info)
    prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true, slug: true, name: true, iconUrl: true },
      take: 12,
    }),
    // Latest activity timestamp across posts/comments/checkins in this community
    getLatestActivityAt(userId, communityId),
    // Heatmap data — 3 parallel aggregations by day for the past 365 days
    prisma.post.findMany({
      where: { userId, communityId, createdAt: { gte: heatmapStart } },
      select: { createdAt: true },
    }),
    prisma.comment.findMany({
      where: {
        userId,
        post: { communityId },
        createdAt: { gte: heatmapStart },
      },
      select: { createdAt: true },
    }),
    prisma.checkin.findMany({
      where: {
        userId,
        challenge: { communityId },
        createdAt: { gte: heatmapStart },
      },
      select: { createdAt: true },
    }),
  ]);

  if (!user) return null;

  const heatmap = buildHeatmap(
    [...heatmapPosts, ...heatmapComments, ...heatmapCheckins].map(
      (x) => x.createdAt
    ),
    heatmapStart
  );

  return {
    user,
    /** Null if the user is NOT a member of this community */
    membership,
    recentPosts: posts.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      body: p.body,
      pillar: p.pillar,
      isCot: p.isCot,
      createdAt: p.createdAt,
      commentCount: p._count.comments,
      reactionCount: p._count.reactions,
    })),
    stats: {
      posts: postCount,
      comments: commentCount,
      checkins: checkinCount,
      contributions: postCount + commentCount + checkinCount,
    },
    otherCommunities: otherMemberships.map((m) => m.community),
    ownedCommunities,
    latestActivityAt: latestActivity,
    heatmap,
  };
}

/**
 * Most recent `createdAt` across post / comment / checkin of the user in this
 * community. Returns null if the user has no activity in this community.
 */
async function getLatestActivityAt(
  userId: string,
  communityId: string
): Promise<Date | null> {
  const [p, c, ci] = await Promise.all([
    prisma.post.findFirst({
      where: { userId, communityId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.comment.findFirst({
      where: { userId, post: { communityId } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.checkin.findFirst({
      where: { userId, challenge: { communityId } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const times = [p?.createdAt, c?.createdAt, ci?.createdAt].filter(
    (x): x is Date => !!x
  );
  if (times.length === 0) return null;
  return new Date(Math.max(...times.map((d) => d.getTime())));
}

/**
 * Bucket a list of timestamps into per-day counts, from start (365 days ago)
 * to today. Days with zero activity still return {date, count:0} so the
 * heatmap grid has a consistent shape.
 */
function buildHeatmap(dates: Date[], start: Date): HeatmapDay[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = toDateKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: HeatmapDay[] = [];
  const cursor = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    const key = toDateKey(cursor);
    out.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function toDateKey(d: Date): string {
  // Local timezone YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
