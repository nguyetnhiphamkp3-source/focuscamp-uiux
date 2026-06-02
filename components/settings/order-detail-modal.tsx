"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { fmtVnd, avatarColorFor, initials } from "@/lib/brand";
import type { OrderRow, AffiliateInfo } from "@/lib/services/community-orders";

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Đã thanh toán",
  PENDING: "Chờ thanh toán",
  EXPIRED: "Hết hạn",
  REFUNDED: "Hoàn tiền",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  COMPLETED: { bg: "rgba(27,158,117,0.12)", color: "var(--success)" },
  PENDING: { bg: "rgba(240,178,50,0.15)", color: "var(--warning)" },
  EXPIRED: { bg: "rgba(242,63,67,0.1)", color: "var(--danger)" },
  REFUNDED: { bg: "rgba(107,101,90,0.12)", color: "var(--text-muted)" },
  CANCELLED: { bg: "rgba(107,101,90,0.12)", color: "var(--text-muted)" },
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

const PROVIDER_LABELS: Record<string, string> = {
  SEPAY_STANDARD: "SePay Standard",
  SEPAY_BANKHUB: "SePay BankHub",
};

function fmtDateFull(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minHeight: 24 }}>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", flexShrink: 0, width: 130, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", wordBreak: "break-all", flex: 1 }}>
        {children}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: 4, borderBottom: "1px solid var(--border-subtle)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const PAYOUT_LABELS: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "Chưa trả", color: "var(--warning)" },
  PAID: { label: "Đã trả", color: "var(--success)" },
  REJECTED: { label: "Từ chối", color: "var(--danger)" },
};

function AffiliateSection({ affiliate }: { affiliate: AffiliateInfo }) {
  const payout = PAYOUT_LABELS[affiliate.payoutStatus] ?? { label: affiliate.payoutStatus, color: "var(--text-muted)" };
  return (
    <Section title="Affiliate">
      <Row label="Người giới thiệu">
        <span style={{ fontWeight: 600 }}>{affiliate.affiliateName ?? affiliate.affiliateEmail}</span>
        {affiliate.affiliateName && (
          <span style={{ marginLeft: 4, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>({affiliate.affiliateEmail})</span>
        )}
      </Row>
      <Row label="Link code">
        <code style={{ fontSize: "var(--text-xs)", background: "var(--bg-modifier-accent)", padding: "2px 6px", borderRadius: 4 }}>
          {affiliate.linkCode}
        </code>
      </Row>
      <Row label="Hoa hồng">
        <span style={{ fontWeight: 600 }}>{fmtVnd(affiliate.commissionVnd)}đ</span>
        <span style={{ marginLeft: 4, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>({affiliate.commissionPercent}%)</span>
      </Row>
      <Row label="Trạng thái">
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: payout.color }}>{payout.label}</span>
      </Row>
    </Section>
  );
}

interface OrderDetailModalProps {
  order: OrderRow;
  actionSlot?: React.ReactNode;
  onClose: () => void;
}

export function OrderDetailModal({ order, onClose, actionSlot }: OrderDetailModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  const statusStyle = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING;
  const hasCoupon = order.discountVnd != null && order.discountVnd > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: "var(--bg-floating)",
          borderRadius: 14,
          border: "1px solid var(--border-subtle)",
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <div id={titleId} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--header-primary)" }}>
              Chi tiết đơn hàng
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              #{order.paymentCode}
            </span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Buyer */}
          <Section title="Người mua">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {order.buyer.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.buyer.image} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarColorFor(order.buyer.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-sm)", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {initials(order.buyer.name ?? order.buyer.email)}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--header-primary)" }}>
                  {order.buyer.name ?? order.buyer.email}
                </span>
                {order.buyer.name && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    {order.buyer.email}
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* Item */}
          <Section title="Sản phẩm / Dịch vụ">
            <Row label="Tên">
              <span style={{ fontWeight: 600 }}>{order.itemTitle}</span>
            </Row>
            <Row label="Loại">
              <span style={{ fontWeight: 600, color: ORDER_TYPE_COLORS[order.orderType] }}>
                {ORDER_TYPE_LABELS[order.orderType]}
              </span>
              {order.itemSubtype && (
                <span style={{ marginLeft: 6, fontSize: "var(--text-xs)", background: "var(--bg-modifier-hover)", padding: "1px 6px", borderRadius: 3 }}>
                  {order.itemSubtype}
                </span>
              )}
            </Row>
            {order.licenseKey && (
              <Row label="License key">
                <code style={{ fontSize: "var(--text-xs)", background: "var(--bg-modifier-accent)", padding: "2px 6px", borderRadius: 4, userSelect: "all" }}>
                  {order.licenseKey}
                </code>
              </Row>
            )}
          </Section>

          {/* Payment */}
          <Section title="Thanh toán">
            <Row label="Trạng thái">
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: statusStyle.bg, color: statusStyle.color }}>
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </Row>
            {hasCoupon ? (
              <>
                <Row label="Giá gốc">
                  <span style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>
                    {fmtVnd(order.originalAmountVnd!)}đ
                  </span>
                </Row>
                <Row label="Giảm giá">
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>
                    -{fmtVnd(order.discountVnd!)}đ
                  </span>
                </Row>
                <Row label="Thanh toán">
                  <span style={{ fontWeight: 700, fontSize: "var(--text-md)", color: "var(--header-primary)" }}>
                    {fmtVnd(order.amountVnd)}đ
                  </span>
                </Row>
                <Row label="Coupon">
                  <code style={{ fontSize: "var(--text-xs)", background: "rgba(27,158,117,0.1)", color: "var(--success)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                    {order.couponCode}
                  </code>
                </Row>
              </>
            ) : (
              <Row label="Số tiền">
                <span style={{ fontWeight: 700, fontSize: "var(--text-md)", color: "var(--header-primary)" }}>
                  {fmtVnd(order.amountVnd)}đ
                </span>
              </Row>
            )}
            {order.approval && (
              <Row label="Xác nhận">
                {order.approval.source === "SEPAY_WEBHOOK" ? (
                  <span style={{ color: "#0ea5e9", fontWeight: 600 }}>⚡ Tự động (SePay)</span>
                ) : (
                  <span style={{ color: "var(--warning)", fontWeight: 600 }}>
                    ✋ Thủ công{order.approval.adminName ? ` — ${order.approval.adminName}` : ""}
                  </span>
                )}
              </Row>
            )}
            {order.cancellation && (
              <Row label="Hủy bởi">
                <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                  {order.cancellation.adminName ?? "Thủ công"}
                </span>
              </Row>
            )}
          </Section>

          {/* Transfer info */}
          <Section title="Thông tin chuyển khoản">
            <Row label="Mã chuyển khoản">
              <code style={{ fontSize: "var(--text-xs)", background: "var(--bg-modifier-accent)", padding: "2px 6px", borderRadius: 4, userSelect: "all" }}>
                {order.paymentCode}
              </code>
            </Row>
            <Row label="Provider">
              {PROVIDER_LABELS[order.provider] ?? order.provider}
            </Row>
            {order.bankName && (
              <Row label="Ngân hàng">{order.bankName}</Row>
            )}
            {order.bankAccount && (
              <Row label="Số tài khoản">
                <code style={{ fontSize: "var(--text-xs)", userSelect: "all" }}>{order.bankAccount}</code>
              </Row>
            )}
            {order.transactionId && (
              <Row label="Transaction ID">
                <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", userSelect: "all" }}>{order.transactionId}</code>
              </Row>
            )}
            {order.buyerIp && (
              <Row label="IP người mua">
                <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", userSelect: "all" }}>{order.buyerIp}</code>
              </Row>
            )}
          </Section>

          {/* Timestamps */}
          <Section title="Thời gian">
            <Row label="Tạo lúc">{fmtDateFull(order.createdAt)}</Row>
            <Row label="Hết hạn">
              <span style={{ color: order.status === "EXPIRED" ? "var(--danger)" : "var(--text-normal)" }}>
                {fmtDateFull(order.expiresAt)}
              </span>
            </Row>
            {order.receivedAt && (
              <Row label="Xác nhận lúc">{fmtDateFull(order.receivedAt)}</Row>
            )}
          </Section>

          {/* Affiliate */}
          {order.affiliate && <AffiliateSection affiliate={order.affiliate} />}
        </div>

        {/* Footer actions */}
        {actionSlot && (
          <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
            {actionSlot}
          </div>
        )}
      </div>
    </div>
  );
}
