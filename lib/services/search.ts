/**
 * Global search — MVP uses case-insensitive `contains` across Post body,
 * User name/handle/bio, and Community name/tagline/description.
 *
 * Phase 2 will switch to Postgres tsvector full-text search for ranking
 * and multi-language support. For now, simple + correct.
 */
import { prisma } from "@/lib/prisma";

export type SearchResults = Awaited<ReturnType<typeof searchAll>>;

export async function searchAll(input: {
  query: string;
  limit?: number;
  /** If set, restrict posts to this community (not the people/communities list). */
  communityId?: string;
  /** Pass current user id so we respect membership gating on future private
   *  communities (not enforced in MVP — all communities visible). */
  viewerId?: string;
}) {
  const q = input.query.trim();
  if (q.length < 2) {
    return { query: q, posts: [], users: [], communities: [] };
  }
  const limit = input.limit ?? 15;
  const like = { contains: q, mode: "insensitive" as const };

  const [posts, users, communities] = await Promise.all([
    prisma.post.findMany({
      where: {
        AND: [
          input.communityId ? { communityId: input.communityId } : {},
          {
            OR: [
              { title: like },
              { body: like },
            ],
          },
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
      where: {
        OR: [{ name: like }, { handle: like }, { bio: like }],
      },
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
        OR: [
          { name: like },
          { tagline: like },
          { description: like },
          { slug: like },
        ],
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
  ]);

  return { query: q, posts, users, communities };
}
