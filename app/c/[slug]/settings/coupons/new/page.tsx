import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  effectiveCommunityRole,
  communityPermissionFlags,
} from "@/lib/community-permissions";
import { CouponForm } from "@/components/settings/coupons/coupon-form";

export const dynamic = "force-dynamic";

export default async function NewCouponPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, name: true, ownerId: true },
  });
  if (!community) notFound();

  const isOwner = community.ownerId === session.user.id;
  const membership = isOwner
    ? null
    : await prisma.membership.findUnique({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId: community.id,
          },
        },
        select: { role: true },
      });
  const perms = communityPermissionFlags(
    effectiveCommunityRole({ isOwner, membershipRole: membership?.role }),
  );
  if (!perms.canManageCoupons) redirect(`/c/${slug}/settings`);

  const [products, challenges] = await Promise.all([
    prisma.product.findMany({
      where: { communityId: community.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.challenge.findMany({
      where: { communityId: community.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <header className="view-header">
        <span className="view-title">Tạo coupon mới</span>
        <span className="view-subtitle">{community.name}</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-8)" }}>
        <div style={{ maxWidth: 720 }} className="ui-card">
          <CouponForm
            communityId={community.id}
            communitySlug={slug}
            products={products}
            challenges={challenges}
          />
        </div>
      </div>
    </>
  );
}
