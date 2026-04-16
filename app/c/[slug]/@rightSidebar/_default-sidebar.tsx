/**
 * Shared handler — render the default community info right sidebar.
 * Import and re-export as `default` from any @rightSidebar/<feature>/page.tsx
 * that should show the default community sidebar.
 */
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CommunityRightSidebar } from "@/components/shell/community-right-sidebar";

export async function DefaultRightSidebar({
  slug,
}: {
  slug: string;
}) {
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
