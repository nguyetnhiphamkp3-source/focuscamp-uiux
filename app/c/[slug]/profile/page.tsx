import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCommunityProfile } from "@/lib/services/profile";
import {
  getClasses,
  getPillars,
  getCurrency,
  getLevelTiers,
} from "@/lib/community-config";
import { ProfileView } from "@/components/profile/profile-view";
import { followCounts } from "@/lib/services/follow";
import { listBookmarks } from "@/lib/services/bookmark";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const [data, counts, rawBookmarks] = await Promise.all([
    getCommunityProfile({
      userId: session.user.id,
      communityId: community.id,
      postsLimit: 14,
    }),
    followCounts(session.user.id),
    // Per-community bookmarks — scoped to this community, max 14.
    listBookmarks({ userId: session.user.id, communityId: community.id, limit: 14 }),
  ]);
  if (!data) notFound();

  const bookmarks = rawBookmarks.map((b) => ({
    id: b.post.id,
    type: b.post.type,
    title: b.post.title,
    body: b.post.body,
    isCot: b.post.isCot,
    createdAt: b.post.createdAt,
    commentCount: b.post._count.comments,
    reactionCount: b.post._count.reactions,
    communitySlug: b.post.community.slug,
    bookmarkedAt: b.createdAt,
  }));

  return (
    <ProfileView
      community={{ name: community.name, slug: community.slug }}
      user={data.user}
      membership={data.membership}
      recentPosts={data.recentPosts}
      stats={data.stats}
      isSelf={true}
      classes={getClasses(community)}
      pillars={getPillars(community)}
      currency={getCurrency(community)}
      levelTiers={getLevelTiers(community)}
      otherCommunities={data.otherCommunities}
      ownedCommunities={data.ownedCommunities}
      latestActivityAt={data.latestActivityAt}
      heatmap={data.heatmap}
      recentXp={data.recentXp}
      viewingUserId={data.user.id}
      viewerId={session.user.id}
      followerCount={counts.followers}
      followingCount={counts.following}
      bookmarks={bookmarks}
    />
  );
}
