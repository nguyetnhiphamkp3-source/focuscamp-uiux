"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionHeader } from "./editor-shared";
import { fmtVnd, avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import type { OrderRow } from "@/lib/services/community-orders";
import {
  approveOrderAction,
  approvePaymentAction,
  approvePlatformPaymentAction,
  deleteExpiredOrderAction,
} from "@/app/actions/orders";
import { ConfirmModal } from "@/components/shared/confirm-modal";

interface OrdersPanelProps {
  orders: OrderRow[];
  total: number;
  totalRevenue: number;
  pendingCount: number;
  communitySlug: string;
  currentPage: number;
  limit: number;
  currentStatus: string;
  basePath?: string;
  mode?: "community" | "platform";
  title?: string;
  subtitle?: string;
}

const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "COMPLETED", label: "Đã thanh toán" },
  { key: "PENDING", label: "Pending" },
  { key: "EXPIRED", label: "Hết hạn" },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  COMPLETED: { bg: "rgba(27,158,117,0.12)", color: "var(--success)" },
  PENDING: { bg: "rgba(240,178,50,0.15)", color: "var(--warning)" },
  EXPIRED: { bg: "rgba(242,63,67,0.1)", color: "var(--danger)" },
  REFUNDED: { bg: "rgba(107,101,90,0.12)", color: "var(--text-muted)" },
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Đã TT",
  PENDING: "Pending",
  EXPIRED: "Hết hạn",
  REFUNDED: "Hoàn tiền",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  TEMPLATE: "Template",
  TOOL: "Tool",
  SOP: "SOP",
  BUNDLE: "Bundle",
  LICENSE: "License",
  PROMPT: "Prompt",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  HARD: "Hard",
  CHAOS: "Chaos",
};

const TIER_LABELS: Record<string, string> = {
  MONTHLY: "Tháng",
  QUARTERLY: "Quý",
  YEARLY: "Năm",
  LIFETIME: "Vĩnh viễn",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  product: "Sản phẩm",
  challenge: "Challenge",
  subscription: "Membership",
  community: "Gói community",
  other: "Khác",
};

const ORDER_TYPE_COLORS: Record<string, string> = {
  product: "var(--brand-green)",
  challenge: "#7c3aed",
  subscription: "#0ea5e9",
  community: "#0f766e",
  other: "var(--text-muted)",
};

function ApprovalChip({ approval }: { approval: OrderRow["approval"] }) {
  if (!approval) return null;
  const isAuto = approval.source === "SEPAY_WEBHOOK";
  const label = isAuto
    ? "⚡ Tự động"
    : `✋ ${approval.adminName ?? "Thủ công"}`;
  const title = isAuto
    ? "Tự động xác nhận qua SePay"
    : approval.adminName
      ? `Duyệt thủ công bởi ${approval.adminName}`
      : "Duyệt thủ công";
  return (
    <span
      title={title}
      style={{
        borderRadius: 3,
        padding: "1px 5px",
        fontWeight: 600,
        flexShrink: 0,
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        background: isAuto ? "rgba(14,165,233,0.12)" : "rgba(240,178,50,0.15)",
        color: isAuto ? "#0ea5e9" : "var(--warning)",
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: style.bg, color: style.color }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ApproveButton({
  order,
  communitySlug,
  mode,
}: {
  order: OrderRow;
  communitySlug: string;
  mode: "community" | "platform";
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (done) return <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: 600 }}>Đã duyệt</span>;

  function confirmApprove() {
    setShowConfirm(false);
    startTransition(async () => {
      let res;
      if (order.orderType === "product" && order.purchaseId) {
        res = await approveOrderAction({ purchaseId: order.purchaseId, communitySlug });
      } else if (mode === "platform") {
        res = await approvePlatformPaymentAction({ paymentId: order.orderId });
      } else {
        res = await approvePaymentAction({ paymentId: order.orderId, communitySlug });
      }
      if (res.ok) setDone(true);
      else alert("Lỗi: " + res.reason);
    });
  }

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        title="Duyệt đơn hàng"
        message="Duyệt thủ công đơn hàng này?"
        confirmLabel="Duyệt"
        onConfirm={confirmApprove}
        onCancel={() => setShowConfirm(false)}
      />
      <button
        disabled={pending}
        onClick={() => setShowConfirm(true)}
        style={{ fontSize: "var(--text-xs)", fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: "1px solid var(--brand-green)", background: "transparent", color: "var(--brand-green)", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Đang duyệt..." : "Duyệt"}
      </button>
    </>
  );
}

function DeleteExpiredButton({
  order,
  communitySlug,
  mode,
}: {
  order: OrderRow;
  communitySlug: string;
  mode: "community" | "platform";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function confirmDelete() {
    setShowConfirm(false);
    startTransition(async () => {
      const res = await deleteExpiredOrderAction({
        paymentId: order.orderId,
        communitySlug,
        mode,
      });
      if (res.ok) router.refresh();
      else alert("Lỗi: " + res.reason);
    });
  }

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        title="Xóa đơn hết hạn"
        message="Xóa vĩnh viễn đơn này cùng các bản ghi treo (chưa hoàn tất) mà nó tạo ra? Không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
      <button
        disabled={pending}
        onClick={() => setShowConfirm(true)}
        style={{ fontSize: "var(--text-xs)", fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Đang xóa..." : "Xóa"}
      </button>
    </>
  );
}

export function OrdersPanel({
  orders,
  total,
  totalRevenue,
  pendingCount,
  communitySlug,
  currentPage,
  limit,
  currentStatus,
  basePath,
  mode = "community",
  title = "Đơn hàng",
  subtitle = "Tất cả đơn hàng của cộng đồng: sản phẩm, challenge, membership.",
}: OrdersPanelProps) {
  const totalPages = Math.ceil(total / limit);
  const rootPath = basePath ?? `/c/${communitySlug}/orders`;
  const tabUrl = (key: string) => key === "ALL" ? rootPath : `${rootPath}?status=${key}`;
  const pageUrl = (p: number) => {
    const q = currentStatus !== "ALL" ? `status=${currentStatus}&` : "";
    return `${rootPath}?${q}${p > 1 ? `page=${p}` : ""}`.replace(/\?$/, "");
  };

  return (
    <div className="orders-panel">
      <SectionHeader title={title} subtitle={subtitle} />

      <div className="orders-stats">
        {[
          { label: "Tổng đơn", value: total },
          { label: "Doanh thu", value: `${fmtVnd(totalRevenue)}đ` },
          { label: "Chờ thanh toán", value: pendingCount },
        ].map(({ label, value }) => (
          <div key={label} className="orders-stat-card">
            <div className="orders-stat-label">{label}</div>
            <div className="orders-stat-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="orders-tabs">
        {TABS.map(({ key, label }) => {
          const active = currentStatus === key;
          return (
            <Link key={key} href={tabUrl(key)} className={`orders-tab${active ? " active" : ""}`}>
              {label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Chưa có đơn hàng nào</div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const subtypeLabel =
              order.orderType === "product" ? (PRODUCT_TYPE_LABELS[order.itemSubtype] ?? order.itemSubtype) :
              order.orderType === "challenge" ? (DIFFICULTY_LABELS[order.itemSubtype] ?? order.itemSubtype) :
              order.orderType === "subscription" ? (TIER_LABELS[order.itemSubtype] ?? order.itemSubtype) :
              order.itemSubtype;

            return (
              <div key={order.orderId} className="orders-card">
                <div className="orders-card-main">
                  {order.buyer.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.buyer.image} alt="" className="orders-avatar" />
                  ) : (
                    <div className="orders-avatar orders-avatar-fallback" style={{ background: avatarColorFor(order.buyer.id) }}>
                      {initials(order.buyer.name ?? order.buyer.email)}
                    </div>
                  )}

                  <div className="orders-info">
                    <div className="orders-buyer">
                      {order.buyer.name ?? order.buyer.email}
                    </div>
                    <div className="orders-meta">
                      <span className="orders-item-title">{order.itemTitle}</span>
                      <span className="orders-chip" style={{ color: ORDER_TYPE_COLORS[order.orderType] }}>
                        {ORDER_TYPE_LABELS[order.orderType]}
                      </span>
                      {subtypeLabel && (
                        <span className="orders-chip">
                          {subtypeLabel}
                        </span>
                      )}
                      <span className="orders-chip">
                        {order.paymentCode}
                      </span>
                      <ApprovalChip approval={order.approval} />
                    </div>
                  </div>

                  <div className="orders-side">
                    <span className="orders-amount">{fmtVnd(order.amountVnd)}đ</span>
                    <StatusBadge status={order.status} />
                    <span className="orders-time">{fmtRelativeTime(order.createdAt)}</span>
                    {order.status === "PENDING" && <ApproveButton order={order} communitySlug={communitySlug} mode={mode} />}
                    {order.status === "EXPIRED" && <DeleteExpiredButton order={order} communitySlug={communitySlug} mode={mode} />}
                  </div>
                </div>

                {order.licenseKey && (
                  <div className="orders-license">
                    <span>License key: </span>
                    <code>{order.licenseKey}</code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: "var(--space-5)" }}>
          {currentPage > 1 ? (
            <Link href={pageUrl(currentPage - 1)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", textDecoration: "none", color: "var(--text-normal)" }}>Trước</Link>
          ) : (
            <span style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", color: "var(--text-muted)", cursor: "not-allowed" }}>Trước</span>
          )}
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Trang {currentPage} / {totalPages}</span>
          {currentPage < totalPages ? (
            <Link href={pageUrl(currentPage + 1)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", textDecoration: "none", color: "var(--text-normal)" }}>Sau</Link>
          ) : (
            <span style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", color: "var(--text-muted)", cursor: "not-allowed" }}>Sau</span>
          )}
        </div>
      )}
    </div>
  );
}
