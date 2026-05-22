import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  effectiveCommunityRole,
  communityPermissionFlags,
} from "@/lib/community-permissions";
import { CouponForm } from "@/components/settings/coupons/coupon-form";

export const dynamic = "force-dynamic";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ slug: string; couponId: string }>;
}) {
  const { slug, couponId } = await params;
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

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, communityId: community.id },
  });
  if (!coupon) notFound();

  const redemptionStats = await prisma.couponRedemption.groupBy({
    by: ["status"],
    where: { couponId: coupon.id },
    _count: { _all: true },
  });
  const statsByStatus = Object.fromEntries(
    redemptionStats.map((s) => [s.status, s._count._all]),
  );

  return (
    <>
      <header className="view-header">
        <span className="view-title">Coupon: {coupon.code}</span>
        <span className="view-subtitle">{community.name}</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-8)" }}>
        <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="ui-card" style={{ padding: "var(--space-4)" }}>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 8 }}>
              Thống kê sử dụng
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <Stat label="Đã hoàn tất" value={statsByStatus.COMPLETED ?? 0} />
              <Stat label="Đang giữ chỗ" value={statsByStatus.PENDING ?? 0} />
              <Stat label="Đã huỷ" value={statsByStatus.CANCELLED ?? 0} />
            </div>
          </div>

          <div className="ui-card">
            <CouponForm
              communityId={community.id}
              communitySlug={slug}
              initial={{
                id: coupon.id,
                code: coupon.code,
                discountType: coupon.discountType as "PERCENTAGE" | "FIXED",
                percentageBps: coupon.percentageBps,
                maxDiscountVnd: coupon.maxDiscountVnd ? Number(coupon.maxDiscountVnd) : null,
                fixedAmountVnd: coupon.fixedAmountVnd ? Number(coupon.fixedAmountVnd) : null,
                minOrderVnd: coupon.minOrderVnd ? Number(coupon.minOrderVnd) : null,
                validFrom: coupon.validFrom?.toISOString() ?? null,
                validUntil: coupon.validUntil?.toISOString() ?? null,
                maxRedemptions: coupon.maxRedemptions,
                perUserLimit: coupon.perUserLimit,
                allowedRefTypes: coupon.allowedRefTypes as ("product" | "challenge" | "cart" | "event")[],
                isActive: coupon.isActive,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-heading)" }}>
        {value}
      </div>
    </div>
  );
}
