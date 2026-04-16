/**
 * Profile service — fetch public profile data for a user in the context of
 * a specific community. Centralizes the JOIN between User + Membership +
 * recent Posts so the detail page + self profile + any future sidebar can
 * share the same query.
 */
import { prisma } from "@/lib/prisma";

export type ProfileData = Awaited<ReturnType<typeof getCommunityProfile>>;

export async function getCommunityProfile(input: {
  userId: string;
  communityId: string;
  postsLimit?: number;
}) {
  const { userId, communityId, postsLimit = 10 } = input;

  const [user, membership, posts, postCount, commentCount, otherMemberships] =
    await Promise.all([
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
      // "Also active in" — other communities this user belongs to. Skool-pattern:
      // show presence only (name + icon), NOT stats/level from those communities.
      // That keeps each community's leaderboard private from outsiders.
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
    ]);

  if (!user) return null;
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
    },
    otherCommunities: otherMemberships.map((m) => m.community),
  };
}
