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

  const data = await getCommunityProfile({
    userId: session.user.id,
    communityId: community.id,
  });
  if (!data) notFound();

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
      viewingUserId={data.user.id}
    />
  );
}
