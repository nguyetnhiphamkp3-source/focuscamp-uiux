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

  const allActivityDates = [
    ...heatmapPosts,
    ...heatmapComments,
    ...heatmapCheckins,
  ].map((x) => x.createdAt);
  const heatmap = buildHeatmap(allActivityDates, heatmapStart);
  const streaks = computeStreaksFromHeatmap(heatmap);
  const peakHour = computePeakHour(allActivityDates);
  const activeDays = heatmap.filter((d) => d.count > 0).length;

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
      activeDays,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      peakHour,
    },
    otherCommunities: otherMemberships.map((m) => m.community),
    ownedCommunities,
    latestActivityAt: latestActivity,
    heatmap,
  };
}

/**
 * From a heatmap (contiguous day buckets, oldest → today), compute:
 *   current: consecutive days with activity ending today (or ending yesterday
 *            if today is 0 — we don't punish a user mid-morning)
 *   longest: longest run of consecutive active days in the window
 */
function computeStreaksFromHeatmap(days: HeatmapDay[]): {
  current: number;
  longest: number;
} {
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;
  for (const d of days) {
    if (d.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak — walk from the end backward. If today is inactive but
  // yesterday was, still count yesterday's streak (grace window until 24h).
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current += 1;
    else if (i === days.length - 1) continue; // today 0 → skip, keep looking
    else break;
  }
  return { current, longest };
}

/**
 * Hour-of-day (0–23) that has the most activity events. Null if no activity.
 * Uses local timezone of the server (same as heatmap keys).
 */
function computePeakHour(dates: Date[]): number | null {
  if (dates.length === 0) return null;
  const buckets = new Array<number>(24).fill(0);
  for (const d of dates) {
    buckets[d.getHours()] += 1;
  }
  let best = 0;
  let bestIdx = 0;
  for (let h = 0; h < 24; h++) {
    if (buckets[h] > best) {
      best = buckets[h];
      bestIdx = h;
    }
  }
  return best > 0 ? bestIdx : null;
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
