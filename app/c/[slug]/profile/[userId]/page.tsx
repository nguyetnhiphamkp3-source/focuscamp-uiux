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
import { followCounts, isFollowing } from "@/lib/services/follow";

export const dynamic = "force-dynamic";

/**
 * Public profile of any user inside this community.
 *
 * If `userId` equals the current user, redirect to `/profile` (canonical URL
 * for self-view) so bookmarks / back-nav stay consistent.
 */
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>;
}) {
  const { slug, userId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (userId === session.user.id) {
    redirect(`/c/${slug}/profile`);
  }

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const [data, counts, viewerIsFollowing] = await Promise.all([
    getCommunityProfile({
      userId,
      communityId: community.id,
    }),
    followCounts(userId),
    session.user.id ? isFollowing(session.user.id, userId) : Promise.resolve(false),
  ]);
  if (!data) notFound();

  return (
    <ProfileView
      community={{ name: community.name, slug: community.slug }}
      user={data.user}
      membership={data.membership}
      recentPosts={data.recentPosts}
      stats={data.stats}
      isSelf={false}
      classes={getClasses(community)}
      pillars={getPillars(community)}
      currency={getCurrency(community)}
      levelTiers={getLevelTiers(community)}
      otherCommunities={data.otherCommunities}
      ownedCommunities={data.ownedCommunities}
      latestActivityAt={data.latestActivityAt}
      heatmap={data.heatmap}
      viewingUserId={data.user.id}
      viewerId={session.user.id}
      viewerIsFollowing={viewerIsFollowing}
      followerCount={counts.followers}
      followingCount={counts.following}
    />
  );
}
