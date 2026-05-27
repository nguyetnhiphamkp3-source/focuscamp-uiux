import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listCommunityAffiliates, listCommunityCommissions } from "@/lib/services/affiliate";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";
import { OwnerAffiliateDashboard } from "@/components/affiliate/owner-affiliate-dashboard";

export const dynamic = "force-dynamic";

export default async function AffiliatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      name: true,
      memberships: { where: { userId: session.user.id }, select: { role: true } },
    },
  });
  if (!community) notFound();

  const role = effectiveCommunityRole({
    isOwner: community.ownerId === session.user.id,
    membershipRole: community.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_settings")) redirect(`/c/${slug}`);

  const { affiliates, totals } = await listCommunityAffiliates(community.id);
  const rawCommissions = await listCommunityCommissions(community.id);
  const commissions = rawCommissions.map((c) => ({
    ...c,
    grossAmountVnd: Number(c.grossAmountVnd),
    commissionVnd: Number(c.commissionVnd),
  }));

  return (
    <>
      <header className="view-header">
        <span className="view-title">Affiliate</span>
        <span className="view-subtitle">{community.name}</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-8)" }}>
        <div style={{ maxWidth: 960 }}>
          <OwnerAffiliateDashboard
            communityId={community.id}
            communitySlug={slug}
            affiliates={affiliates}
            commissions={commissions}
            totals={totals}
          />
        </div>
      </div>
    </>
  );
}
