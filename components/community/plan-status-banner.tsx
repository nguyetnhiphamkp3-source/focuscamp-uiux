"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renewCommunityPlanAction } from "@/app/actions/community";
import type { PlanState } from "@/lib/platform-plans";

/**
 * Shows on community pages when the plan needs attention. Owner-only render
 * for "active with grace warning" + "expired" + "pending"; member-facing for
 * "expired" / "pending" (read-only banner).
 */
export function PlanStatusBanner({
  state,
  isOwner,
  communityId,
}: {
  state: PlanState;
  isOwner: boolean;
  communityId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Active and grandfathered → no banner
  if (state.status === "active" || state.status === "grandfathered") return null;

  // Active but within 7 days of expiry → warning banner for owner only
  // (handled below via grace check)

  function renew() {
    setErr(null);
    start(async () => {
      const res = await renewCommunityPlanAction({ communityId });
      if (res.ok) {
        router.push(`/pay/${res.paymentCode}`);
      } else {
        setErr(res.reason);
      }
    });
  }

  let bg = "rgba(240, 178, 50, 0.12)";
  let border = "rgba(240, 178, 50, 0.4)";
  let color = "var(--premium-gold)";
  let title = "";
  let body = "";
  let cta: string | null = "Gia hạn ngay";

  if (state.status === "pending") {
    bg = "rgba(218, 55, 60, 0.08)";
    border = "rgba(218, 55, 60, 0.4)";
    color = "var(--danger)";
    title = "Cộng đồng chưa kích hoạt";
    body = isOwner
      ? "Bạn cần thanh toán gói để mở khoá tính năng cho thành viên."
      : "Owner chưa thanh toán gói. Cộng đồng tạm thời chưa hoạt động.";
    cta = isOwner ? "Thanh toán ngay" : null;
  } else if (state.status === "grace") {
    title = `Plan đã hết hạn ${Math.abs(state.daysLeft ?? 0)} ngày trước`;
    body = isOwner
      ? `Bạn còn ${7 + (state.daysLeft ?? 0)} ngày để gia hạn trước khi cộng đồng bị chuyển read-only.`
      : "Owner cần gia hạn để cộng đồng tiếp tục hoạt động.";
    cta = isOwner ? "Gia hạn ngay" : null;
  } else if (state.status === "expired") {
    bg = "rgba(218, 55, 60, 0.08)";
    border = "rgba(218, 55, 60, 0.4)";
    color = "var(--danger)";
    title = "Plan đã hết hạn — cộng đồng đang ở chế độ read-only";
    body = isOwner
      ? "Gia hạn để mở lại đăng bài, check-in, tạo content."
      : "Owner cần gia hạn. Bạn vẫn xem được nội dung cũ.";
    cta = isOwner ? "Gia hạn ngay" : null;
  }

  return (
    <div
      style={{
        margin: "var(--space-3) var(--space-3) 0",
        padding: "10px 14px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--r-md)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color }}>
          {title}
        </div>
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginTop: 2,
          }}
        >
          {body}
        </div>
        {err && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 4 }}>
            {err}
          </div>
        )}
      </div>
      {cta && (
        <button
          type="button"
          onClick={renew}
          disabled={pending}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--brand-green)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Đang xử lý…" : cta}
        </button>
      )}
    </div>
  );
}
