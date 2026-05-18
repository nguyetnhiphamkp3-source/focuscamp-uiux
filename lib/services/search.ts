/**
 * Global search — uses Postgres tsvector full-text search with GIN indexes.
 * Falls back to ILIKE if tsvector columns don't exist yet (pre-migration).
 *
 * Uses 'simple' config (no stemming) — works well for Vietnamese + English
 * mixed content without requiring language-specific dictionaries.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type SearchResults = Awaited<ReturnType<typeof searchAll>>;

/**
 * Convert user query to tsquery format.
 * "hello world" → "hello & world" (AND semantics — all words must match).
 */
function toTsQuery(q: string): string {
  return q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, ""))
    .filter((w) => w.length > 0)
    .join(" & ");
}

export async function searchAll(input: {
  query: string;
  limit?: number;
  communityId?: string;
  viewerId?: string;
}) {
  const q = input.query.trim();
  if (q.length < 2) {
    return { query: q, posts: [], users: [], communities: [], challenges: [] };
  }
  const limit = input.limit ?? 15;
  const tsq = toTsQuery(q);

  // Challenge search (no searchVector, always ILIKE)
  const challengesPromise = searchChallenges(q, limit);

  // Try tsvector search first, fall back to ILIKE
  if (tsq) {
    try {
      const [rawPosts, rawUsers, communities, challenges] = await Promise.all([
        searchPostsFts(tsq, limit, input.communityId),
        searchUsersFts(tsq, limit),
        searchCommunitiesFts(tsq, limit),
        challengesPromise,
      ]);
      // Normalize FTS results to match Prisma shape
      const posts = rawPosts.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.body,
        createdAt: p.createdAt,
        user: { id: p.userId, name: p.userName, image: p.userImage },
        community: { slug: p.communitySlug, name: p.communityName },
        _count: { comments: p.commentCount, reactions: p.reactionCount },
      }));
      const users = rawUsers.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.handle,
        image: u.image,
        bio: u.bio,
        _count: { memberships: u.membershipCount },
      }));
      return { query: q, posts, users, communities, challenges };
    } catch (err) {
      // tsvector columns might not exist yet — fall back
      logger.warn({ err }, "[search] FTS failed, falling back to ILIKE");
    }
  }

  // Fallback: ILIKE (pre-migration compatibility)
  return searchFallback(q, limit, input.communityId);
}

/* ===== Full-text search queries ===== */

async function searchPostsFts(tsq: string, limit: number, communityId?: string) {
  const args: unknown[] = [tsq, limit];
  let communityClause = "";
  if (communityId) {
    args.push(communityId);
    communityClause = `AND p."communityId" = $${args.length}`;
  }
  return prisma.$queryRawUnsafe<
    {
      id: string;
      type: string;
      title: string | null;
      body: string;
      createdAt: Date;
      userId: string;
      userName: string | null;
      userImage: string | null;
      communitySlug: string;
      communityName: string;
      commentCount: number;
      reactionCount: number;
      rank: number;
    }[]
  >(
    `SELECT p."id", p."type", p."title", substring(p."body" from 1 for 300) as "body",
            p."createdAt", p."userId",
            u."name" as "userName", u."image" as "userImage",
            c."slug" as "communitySlug", c."name" as "communityName",
            (SELECT COUNT(*)::int FROM "Comment" WHERE "postId" = p."id") as "commentCount",
            (SELECT COUNT(*)::int FROM "Reaction" WHERE "postId" = p."id") as "reactionCount",
            ts_rank(p."searchVector", to_tsquery('simple', $1)) as "rank"
     FROM "Post" p
     JOIN "User" u ON p."userId" = u."id"
     JOIN "Community" c ON p."communityId" = c."id"
     WHERE p."searchVector" @@ to_tsquery('simple', $1)
     ${communityClause}
     ORDER BY "rank" DESC, p."createdAt" DESC
     LIMIT $2`,
    ...args,
  );
}

async function searchUsersFts(tsq: string, limit: number) {
  return prisma.$queryRawUnsafe<
    {
      id: string;
      name: string | null;
      handle: string | null;
      image: string | null;
      bio: string | null;
      membershipCount: number;
    }[]
  >(
    `SELECT u."id", u."name", u."handle", u."image", u."bio",
            (SELECT COUNT(*)::int FROM "Membership" WHERE "userId" = u."id") as "membershipCount"
     FROM "User" u
     WHERE u."searchVector" @@ to_tsquery('simple', $1)
     ORDER BY ts_rank(u."searchVector", to_tsquery('simple', $1)) DESC
     LIMIT $2`,
    tsq,
    limit,
  );
}

async function searchCommunitiesFts(tsq: string, limit: number) {
  return prisma.$queryRawUnsafe<
    {
      id: string;
      slug: string;
      name: string;
      tagline: string | null;
      iconUrl: string | null;
      memberCount: number;
    }[]
  >(
    `SELECT c."id", c."slug", c."name", c."tagline", c."iconUrl", c."memberCount"
     FROM "Community" c
     WHERE c."searchVector" @@ to_tsquery('simple', $1)
     ORDER BY ts_rank(c."searchVector", to_tsquery('simple', $1)) DESC
     LIMIT $2`,
    tsq,
    limit,
  );
}

/* ===== Challenge search (ILIKE, no searchVector) ===== */

async function searchChallenges(q: string, limit: number) {
  const like = { contains: q, mode: "insensitive" as const };
  return prisma.challenge.findMany({
    where: {
      status: { in: ["OPEN", "ACTIVE"] },
      OR: [{ title: like }, { description: like }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      difficulty: true,
      status: true,
      community: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/* ===== ILIKE fallback (pre-migration) ===== */

async function searchFallback(q: string, limit: number, communityId?: string) {
  const like = { contains: q, mode: "insensitive" as const };
  const [posts, users, communities, challenges] = await Promise.all([
    prisma.post.findMany({
      where: {
        AND: [
          communityId ? { communityId } : {},
          { OR: [{ title: like }, { body: like }] },
        ],
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, name: true, image: true } },
        community: { select: { slug: true, name: true } },
        _count: { select: { comments: true, reactions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.user.findMany({
      where: { OR: [{ name: like }, { handle: like }, { bio: like }] },
      select: {
        id: true,
        name: true,
        handle: true,
        image: true,
        bio: true,
        _count: { select: { memberships: true } },
      },
      take: limit,
    }),
    prisma.community.findMany({
      where: {
        OR: [{ name: like }, { tagline: like }, { description: like }, { slug: like }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        iconUrl: true,
        memberCount: true,
      },
      take: limit,
    }),
    searchChallenges(q, limit),
  ]);
  return { query: q, posts, users, communities, challenges };
}
