import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClasses, getLevelTiers } from "@/lib/community-config";
import {
  communityPermissionFlags,
  effectiveCommunityRole,
} from "@/lib/community-permissions";
import { listMembers } from "@/lib/services/community-settings";
import { MembersEditor } from "@/components/settings/members-editor";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const isOwner = community.ownerId === session.user.id;
  const membership = !isOwner
    ? await prisma.membership.findUnique({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId: community.id,
          },
        },
        select: { role: true },
      })
    : null;
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: membership?.role,
  });
  const perms = communityPermissionFlags(role);

  if (!perms.canViewMembers) redirect(`/c/${slug}`);

  const classes = getClasses(community);
  const tiers = getLevelTiers(community);
  const { members, total } = await listMembers({
    communityId: community.id,
    limit: 100,
  });

  return (
    <>
      <header className="view-header">
        <span className="view-title">Thành viên</span>
        <span className="view-subtitle">{community.name}</span>
      </header>

      <div className="settings-page-scroll">
        <div className="settings-page-inner settings-page-inner-wide">
          <MembersEditor
            communityId={community.id}
            communitySlug={slug}
            members={members.map((m) => ({
              userId: m.userId,
              role: m.role,
              tier: m.tier,
              className: m.className,
              xp: m.xp,
              level: m.level,
              joinedAt: m.joinedAt,
              lastActiveAt: m.lastActiveAt,
              user: m.user,
            }))}
            total={total}
            canManageRoles={perms.canManageRoles}
            ownerId={community.ownerId}
            currentUserId={session.user.id}
            classes={classes}
            levelTiers={tiers}
          />
        </div>
      </div>
    </>
  );
}
