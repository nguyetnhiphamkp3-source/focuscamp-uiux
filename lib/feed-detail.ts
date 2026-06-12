import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPostWithComments } from "@/lib/services/post";
import { getPillars, getCurrency } from "@/lib/community-config";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";

/**
 * Load everything the post-detail view needs (post + comments + permission
 * flags). Shared by the full detail page and the comment modal so both render
 * identically. Returns null if the post/community is missing.
 */
export async function loadPostDetail(slug: string, postId: string) {
  const [community, session] = await Promise.all([
    prisma.community.findUnique({
      where: { slug },
      select: { id: true, name: true, ownerId: true, pillarsConfig: true, gemsConfig: true },
    }),
    auth(),
  ]);
  if (!community) return null;
  const userId = session?.user?.id;

  const [data, membership] = await Promise.all([
    getPostWithComments(postId, userId),
    userId
      ? prisma.membership.findUnique({
          where: { userId_communityId: { userId, communityId: community.id } },
          select: { role: true },
        })
      : Promise.resolve(null),
  ]);
  if (!data || data.post.community.id !== community.id) return null;

  const realIsOwner = userId === community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);
  const role = effectiveCommunityRole({ isOwner, membershipRole: membership?.role });

  return {
    slug,
    post: data.post,
    comments: data.comments,
    pillars: getPillars(community),
    currency: getCurrency(community),
    permissions: communityPermissionFlags(role),
    isOwner,
    isAuthor: userId === data.post.user.id,
    isMember: !!membership,
    userId: userId ?? null,
    sessionUser: session?.user
      ? { id: userId!, name: session.user.name ?? null, image: session.user.image ?? null }
      : null,
  };
}

export type PostDetailData = NonNullable<Awaited<ReturnType<typeof loadPostDetail>>>;
