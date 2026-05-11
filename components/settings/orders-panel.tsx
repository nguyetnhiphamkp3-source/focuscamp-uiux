"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { rowCard, SectionHeader } from "./editor-shared";
import { fmtVnd, avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import type { OrderRow } from "@/lib/services/community-orders";
import { approveOrderAction } from "@/app/actions/orders";

interface OrdersPanelProps {
  orders: OrderRow[];
  total: number;
  totalRevenue: number;
  pendingCount: number;
  communitySlug: string;
  currentPage: number;
  limit: number;
  currentStatus: string;
}

const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "COMPLETED", label: "Đã thanh toán" },
  { key: "PENDING", label: "Chờ TT" },
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
  PENDING: "Chờ TT",
  EXPIRED: "Hết hạn",
  REFUNDED: "Hoàn tiền",
};

const TYPE_LABELS: Record<string, string> = {
  TEMPLATE: "Template",
  TOOL: "Tool",
  SOP: "SOP",
  BUNDLE: "Bundle",
  LICENSE: "License",
  PROMPT: "Prompt",
};

function ApproveButton({ purchaseId, communitySlug }: { purchaseId: string; communitySlug: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: 600 }}>Đã duyệt ✓</span>;

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Duyệt thủ công đơn hàng này?")) return;
        startTransition(async () => {
          const res = await approveOrderAction({ purchaseId, communitySlug });
          if (res.ok) setDone(true);
          else alert("Lỗi: " + res.reason);
        });
      }}
      style={{
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 5,
        border: "1px solid var(--brand-green)",
        background: "transparent",
        color: "var(--brand-green)",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Đang duyệt…" : "Duyệt"}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <span style={{
      fontSize: "var(--text-xs)",
      fontWeight: 600,
      padding: "2px 7px",
      borderRadius: 4,
      background: style.bg,
      color: style.color,
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
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
}: OrdersPanelProps) {
  const totalPages = Math.ceil(total / limit);

  const tabUrl = (key: string) =>
    key === "ALL"
      ? `/c/${communitySlug}/orders`
      : `/c/${communitySlug}/orders?status=${key}`;

  const pageUrl = (p: number) => {
    const base = currentStatus === "ALL" ? "" : `?status=${currentStatus}&`;
    const sep = base ? "&" : "?";
    return `/c/${communitySlug}/orders${base}${p > 1 ? `${base ? sep : "?"}page=${p}` : ""}`.replace(
      "?&",
      "?"
    );
  };

  return (
    <div>
      <SectionHeader title="Đơn hàng" subtitle="Tất cả đơn mua sản phẩm từ marketplace của cộng đồng." />

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        {[
          { label: "Tổng đơn", value: total },
          { label: "Doanh thu", value: `${fmtVnd(totalRevenue)}đ` },
          { label: "Chờ thanh toán", value: pendingCount },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: 1,
            minWidth: 120,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            padding: "12px 16px",
          }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--header-primary)", marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: "var(--space-4)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 0 }}>
        {TABS.map(({ key, label }) => {
          const active = currentStatus === key;
          return (
            <Link key={key} href={tabUrl(key)} style={{
              padding: "8px 14px",
              fontSize: "var(--text-sm)",
              fontWeight: active ? 700 : 500,
              color: active ? "var(--brand-green)" : "var(--text-muted)",
              borderBottom: active ? "2px solid var(--brand-green)" : "2px solid transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Order rows */}
      {orders.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Chưa có đơn hàng nào
        </div>
      ) : (
        <div>
          {orders.map((order) => {
            const payStatus = order.payment?.status ?? order.purchaseStatus;
            return (
              <div key={order.purchaseId} style={{ ...rowCard, flexDirection: "column", alignItems: "stretch", gap: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {/* Avatar */}
                  {order.buyer.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.buyer.image} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: avatarColorFor(order.buyer.id),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "var(--text-xs)", fontWeight: 700, color: "#fff",
                    }}>
                      {initials(order.buyer.name ?? order.buyer.email)}
                    </div>
                  )}

                  {/* Center info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--header-primary)", fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.buyer.name ?? order.buyer.email}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{order.product.title}</span>
                      <span style={{ background: "var(--bg-elevated)", borderRadius: 3, padding: "1px 5px", fontWeight: 600, flexShrink: 0 }}>
                        {TYPE_LABELS[order.product.type] ?? order.product.type}
                      </span>
                    </div>
                  </div>

                  {/* Right: amount + status + date */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: "var(--success)", fontSize: "var(--text-sm)" }}>
                      {fmtVnd(order.amountVnd)}đ
                    </span>
                    <StatusBadge status={payStatus} />
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      {fmtRelativeTime(order.purchaseCreatedAt)}
                    </span>
                    {order.purchaseStatus === "PENDING" && (
                      <ApproveButton purchaseId={order.purchaseId} communitySlug={communitySlug} />
                    )}
                  </div>
                </div>

                {/* License key */}
                {order.licenseKey && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>License key: </span>
                    <code style={{ fontSize: "var(--text-xs)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em" }}>
                      {order.licenseKey}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: "var(--space-5)" }}>
          {currentPage > 1 ? (
            <Link href={pageUrl(currentPage - 1)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", textDecoration: "none", color: "var(--text-normal)" }}>← Trước</Link>
          ) : (
            <span style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", color: "var(--text-muted)", cursor: "not-allowed" }}>← Trước</span>
          )}
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Trang {currentPage} / {totalPages}</span>
          {currentPage < totalPages ? (
            <Link href={pageUrl(currentPage + 1)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", textDecoration: "none", color: "var(--text-normal)" }}>Sau →</Link>
          ) : (
            <span style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)", color: "var(--text-muted)", cursor: "not-allowed" }}>Sau →</span>
          )}
        </div>
      )}
    </div>
  );
}
