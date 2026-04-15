import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CommunityRightSidebar } from "@/components/shell/community-right-sidebar";

export const dynamic = "force-dynamic";

export default async function DefaultRightSidebar({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  let membership = null;
  if (session?.user?.id) {
    membership = await prisma.membership.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId: community.id,
        },
      },
    });
  }

  return (
    <CommunityRightSidebar
      community={{
        id: community.id,
        slug: community.slug,
        name: community.name,
        tagline: community.tagline,
        description: community.description,
        memberCount: community.memberCount,
        onlineCount: community.onlineCount,
      }}
      membership={
        membership
          ? {
              role: membership.role,
              tier: membership.tier,
              xp: membership.xp,
            }
          : null
      }
      isLoggedIn={!!session?.user}
    />
  );
}
