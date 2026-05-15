import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listCommunityOrders } from "@/lib/services/community-orders";
import { OrdersPanel } from "@/components/settings/orders-panel";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["PENDING", "COMPLETED", "EXPIRED", "REFUNDED"];
const LIMIT = 20;

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

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
  if (!canCommunity(role, "manage_orders")) redirect(`/c/${slug}`);

  const status = VALID_STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const { orders, total, totalRevenue, pendingCount } = await listCommunityOrders(
    community.id,
    { status, limit: LIMIT, offset: (page - 1) * LIMIT }
  );

  return (
    <>
      <header className="view-header">
        <span className="view-title">Đơn hàng</span>
        <span className="view-subtitle">{community.name}</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-8)" }}>
        <div style={{ maxWidth: 860 }}>
          <OrdersPanel
            orders={orders}
            total={total}
            totalRevenue={totalRevenue}
            pendingCount={pendingCount}
            communitySlug={slug}
            currentPage={page}
            limit={LIMIT}
            currentStatus={status ?? "ALL"}
          />
        </div>
      </div>
    </>
  );
}
