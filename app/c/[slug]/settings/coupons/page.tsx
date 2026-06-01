import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  effectiveCommunityRole,
  communityPermissionFlags,
} from "@/lib/community-permissions";
import { CouponRowActions } from "@/components/settings/coupons/coupon-row-actions";

export const dynamic = "force-dynamic";

function formatDiscount(c: {
  discountType: string;
  percentageBps: number | null;
  fixedAmountVnd: { toString(): string } | null;
}): string {
  if (c.discountType === "PERCENTAGE") {
    return `-${(c.percentageBps ?? 0) / 100}%`;
  }
  return `-${Number(c.fixedAmountVnd ?? 0).toLocaleString("vi-VN")}đ`;
}

export default async function CouponsListPage({
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

  const coupons = await prisma.coupon.findMany({
    where: { communityId: community.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const counts = await prisma.couponRedemption.groupBy({
    by: ["couponId"],
    where: {
      couponId: { in: coupons.map((c) => c.id) },
      status: { in: ["PENDING", "COMPLETED"] },
    },
    _count: { _all: true },
  });
  const usedByCoupon = new Map(counts.map((c) => [c.couponId, c._count._all]));

  return (
    <>
      <header className="view-header">
        <span className="view-title">Mã giảm giá</span>
        <span className="view-subtitle">{community.name}</span>
      </header>

      <div className="settings-page-scroll">
        <div className="settings-page-inner settings-page-inner-wide">
          <div
            className="settings-page-toolbar"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-4)",
            }}
          >
            <Link
              href={`/c/${slug}/settings?tab=billing`}
              style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", textDecoration: "none" }}
            >
              ← Quay lại cài đặt
            </Link>
            <Link
              href={`/c/${slug}/settings/coupons/new`}
              className="ui-btn ui-btn-primary"
              style={{ textDecoration: "none" }}
            >
              + Tạo coupon mới
            </Link>
          </div>

          {coupons.length === 0 ? (
            <div
              className="ui-card"
              style={{
                padding: "var(--space-8)",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Chưa có coupon nào. Tạo coupon đầu tiên để giảm giá cho thành viên.
            </div>
          ) : (
            <div className="ui-card settings-table-card" style={{ padding: 0, overflow: "hidden" }}>
              <table
                className="settings-coupons-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "var(--text-sm)",
                }}
              >
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    <th style={thStyle}>Mã</th>
                    <th style={thStyle}>Giảm</th>
                    <th style={thStyle}>Loại đơn</th>
                    <th style={thStyle}>Hết hạn</th>
                    <th style={thStyle}>Dùng</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const used = usedByCoupon.get(c.id) ?? 0;
                    const usageLabel = c.maxRedemptions
                      ? `${used}/${c.maxRedemptions}`
                      : `${used}/∞`;
                    return (
                      <tr key={c.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        <td style={tdStyle}>
                          <Link
                            href={`/c/${slug}/settings/coupons/${c.id}`}
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "var(--text-heading)",
                              textDecoration: "none",
                            }}
                          >
                            {c.code}
                          </Link>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ color: "var(--brand-green)", fontWeight: 600 }}>
                            {formatDiscount(c)}
                          </span>
                        </td>
                        <td style={tdStyle}>{c.allowedRefTypes.join(", ")}</td>
                        <td style={tdStyle}>
                          {c.validUntil
                            ? new Date(c.validUntil).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                        <td style={tdStyle}>{usageLabel}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: c.isActive
                                ? "rgba(27, 158, 117, 0.15)"
                                : "var(--bg-elevated)",
                              color: c.isActive ? "var(--brand-green)" : "var(--text-muted)",
                            }}
                          >
                            {c.isActive ? "Hoạt động" : "Tạm dừng"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <CouponRowActions
                            communityId={community.id}
                            couponId={c.id}
                            isActive={c.isActive}
                            redemptionsUsed={used}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: "var(--text-xs)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "middle",
};
