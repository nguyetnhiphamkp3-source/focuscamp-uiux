import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrdersPanel } from "@/components/settings/orders-panel";
import { isSuperAdmin } from "@/lib/platform-admin";
import { listPlatformOrders } from "@/lib/services/community-orders";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["PENDING", "COMPLETED", "EXPIRED", "REFUNDED", "CANCELLED"];
const LIMIT = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const s = await auth();
  if (!s?.user?.id) redirect("/login?redirectTo=/admin/orders");
  if (!(await isSuperAdmin(s.user.id))) redirect("/");

  const sp = await searchParams;
  const status = VALID_STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const { orders, total, totalRevenue, pendingCount } = await listPlatformOrders({
    status,
    limit: LIMIT,
    offset: (page - 1) * LIMIT,
  });

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <header className="view-header">
        <span className="view-title">Platform orders</span>
        <span className="view-subtitle">focus.camp community plans</span>
      </header>
      <div style={{ padding: "var(--space-6) var(--space-8)" }}>
        <div style={{ maxWidth: 900 }}>
          <OrdersPanel
            orders={orders}
            total={total}
            totalRevenue={totalRevenue}
            pendingCount={pendingCount}
            communitySlug=""
            currentPage={page}
            limit={LIMIT}
            currentStatus={status ?? "ALL"}
            basePath="/admin/orders"
            mode="platform"
            title="Platform orders"
            subtitle="Community creation and renewal payments sold by focus.camp."
          />
        </div>
      </div>
    </div>
  );
}
