/**
 * Daily community digest — auto-posts a 24h activity summary as a
 * community post. Runs nightly via GitHub Actions → SSH → docker exec.
 *
 * Behavior:
 *   1. For every community whose owner email is SEED_OWNER_EMAIL (i.e. the
 *      operator's own communities) AND that's on a paid plan tier, build a
 *      digest of the last 24h.
 *   2. Skip if there was zero activity (no posts, no comments, no checkins,
 *      no XP events) — don't spam the feed with empty digests.
 *   3. Post the digest authored by the owner with type=POST. Idempotent:
 *      a tag prefix `[digest YYYY-MM-DD]` lets us detect + skip same-day
 *      reruns.
 *
 * Env:
 *   DIGEST_COMMUNITY_SLUG — restrict to one community (otherwise loops all
 *                           owner-paid communities)
 *
 * Usage:
 *   docker compose exec app npx tsx scripts/daily-digest.ts
 */
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface DigestNumbers {
  posts: number;
  comments: number;
  checkins: number;
  newMembers: number;
  topPosters: { name: string; xp: number }[];
  topPost: {
    id: string;
    title: string | null;
    type: string;
    reactions: number;
    comments: number;
    authorName: string | null;
  } | null;
}

async function gatherNumbers(communityId: string, since: Date): Promise<DigestNumbers> {
  const [posts, comments, checkins, newMembers, xpAgg, topPostRow] = await Promise.all([
    prisma.post.count({ where: { communityId, createdAt: { gte: since } } }),
    prisma.comment.count({
      where: { post: { communityId }, createdAt: { gte: since } },
    }),
    prisma.checkin.count({
      where: { challenge: { communityId }, createdAt: { gte: since } },
    }),
    prisma.membership.count({
      where: { communityId, joinedAt: { gte: since } },
    }),
    prisma.xPLedger.groupBy({
      by: ["userId"],
      where: { communityId, createdAt: { gte: since } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 3,
    }),
    prisma.post.findFirst({
      where: { communityId, createdAt: { gte: since } },
      orderBy: [{ reactions: { _count: "desc" } }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        type: true,
        user: { select: { name: true } },
        _count: { select: { reactions: true, comments: true } },
      },
    }),
  ]);

  const topPosterIds = xpAgg.map((x) => x.userId);
  const topPosterUsers = topPosterIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topPosterIds } },
        select: { id: true, name: true },
      })
    : [];
  const topPosters = xpAgg
    .map((x) => {
      const u = topPosterUsers.find((u) => u.id === x.userId);
      return {
        name: u?.name ?? "Ẩn danh",
        xp: Number(x._sum.amount ?? 0),
      };
    })
    .filter((p) => p.xp > 0);

  return {
    posts,
    comments,
    checkins,
    newMembers,
    topPosters,
    topPost: topPostRow
      ? {
          id: topPostRow.id,
          title: topPostRow.title,
          type: topPostRow.type,
          reactions: topPostRow._count.reactions,
          comments: topPostRow._count.comments,
          authorName: topPostRow.user.name,
        }
      : null,
  };
}

function formatDigest(d: DigestNumbers, dateStr: string): string {
  const lines: string[] = [];
  lines.push(`📊 **Tổng kết cộng đồng — ${dateStr}**`);
  lines.push("");
  lines.push(
    `Hôm qua chúng ta có **${d.posts} bài viết**, **${d.comments} bình luận**, **${d.checkins} check-in**, và **${d.newMembers} thành viên mới**. 🎉`,
  );

  if (d.topPosters.length > 0) {
    lines.push("");
    lines.push("🔥 **Top contributor (24h)**");
    d.topPosters.forEach((p, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] ?? "•";
      lines.push(`${medal} **${p.name}** — +${p.xp} XP`);
    });
  }

  if (d.topPost) {
    lines.push("");
    lines.push(
      `📌 **Bài nổi bật**: "${d.topPost.title ?? "(không tiêu đề)"}" của ${d.topPost.authorName ?? "ai đó"} — ❤️ ${d.topPost.reactions} · 💬 ${d.topPost.comments}`,
    );
  }

  lines.push("");
  lines.push(
    "_Digest tự động sinh hằng ngày. Im lặng = không có hoạt động hôm qua._",
  );
  return lines.join("\n");
}

async function processCommunity(community: {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}): Promise<void> {
  const since = new Date(Date.now() - ONE_DAY_MS);
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const digestTag = `[digest ${dateStr}]`;

  // Idempotency: if today's digest already posted in this community, skip.
  const existing = await prisma.post.findFirst({
    where: {
      communityId: community.id,
      title: { contains: digestTag },
    },
    select: { id: true },
  });
  if (existing) {
    logger.info(
      { community: community.slug, postId: existing.id },
      "[daily-digest] already posted today — skipping",
    );
    return;
  }

  const numbers = await gatherNumbers(community.id, since);
  const totalActivity =
    numbers.posts + numbers.comments + numbers.checkins + numbers.newMembers;
  if (totalActivity === 0) {
    logger.info(
      { community: community.slug },
      "[daily-digest] zero activity — skipping",
    );
    return;
  }

  const body = formatDigest(numbers, dateStr);
  const title = `${digestTag} Tổng kết ${dateStr}`;
  const post = await prisma.post.create({
    data: {
      communityId: community.id,
      userId: community.ownerId,
      type: "POST",
      title,
      body,
    },
  });
  logger.info(
    {
      community: community.slug,
      postId: post.id,
      activity: totalActivity,
    },
    "[daily-digest] posted",
  );
}

async function main(): Promise<void> {
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  if (!ownerEmail) {
    logger.error("[daily-digest] SEED_OWNER_EMAIL not set — aborting");
    process.exit(1);
  }

  const owner = await prisma.user.findFirst({
    where: { email: ownerEmail },
    select: { id: true },
  });
  if (!owner) {
    logger.error({ ownerEmail }, "[daily-digest] owner not found");
    process.exit(1);
  }

  const slugFilter = process.env.DIGEST_COMMUNITY_SLUG;
  const communities = await prisma.community.findMany({
    where: {
      ownerId: owner.id,
      planTier: { in: ["SOLO", "PRO", "AGENCY"] },
      ...(slugFilter ? { slug: slugFilter } : {}),
    },
    select: { id: true, name: true, slug: true, ownerId: true },
  });

  if (communities.length === 0) {
    logger.warn(
      { slugFilter },
      "[daily-digest] no eligible communities — skipping",
    );
    return;
  }

  logger.info(
    { count: communities.length, slugs: communities.map((c) => c.slug) },
    "[daily-digest] starting",
  );

  for (const c of communities) {
    try {
      await processCommunity(c);
    } catch (err) {
      logger.error(
        { err, community: c.slug },
        "[daily-digest] failed for one community — continuing",
      );
    }
  }
  logger.info("[daily-digest] done");
}

main()
  .catch((err) => {
    logger.error({ err }, "[daily-digest] fatal");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
