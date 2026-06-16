"use client";

import { useTransition } from "react";
import { markAffiliateCommissionPayoutAction } from "@/app/actions/affiliate";
import { fmtVnd, fmtRelativeTime } from "@/lib/brand";

interface CommissionRow {
  id: string;
  payoutStatus: string;
  payoutNote: string | null;
  commissionVnd: number | string;
  grossAmountVnd: number | string;
  sourceType: string;
  itemTitle: string | null;
  createdAt: Date | string;
  referral: {
    referredUser: { id: string; name: string | null; email?: string | null; image: string | null } | null;
    link: { code: string; user: { id: string; name: string | null; image: string | null } };
  };
}

function PayoutBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PAID:     { label: "Đã thanh toán", color: "var(--brand-green)", bg: "rgba(27,158,117,0.1)" },
    REJECTED: { label: "Từ chối",       color: "var(--danger)",      bg: "rgba(220,53,69,0.1)"  },
    UNPAID:   { label: "Chờ thanh toán", color: "var(--text-muted)", bg: "rgba(128,128,128,0.08)" },
  };
  const s = map[status] ?? map.UNPAID;
  return (
    <span style={{
      fontSize: "var(--text-xs)", fontWeight: 600,
      color: s.color, background: s.bg,
      padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

const GRID = "repeat(5, 1fr)";

export function ReferralTable({
  commissions,
  communityId,
  communitySlug,
}: {
  commissions: CommissionRow[];
  communityId: string;
  communitySlug: string;
}) {
  const [pending, start] = useTransition();

  function handlePayout(commissionId: string, status: "PAID" | "REJECTED") {
    start(async () => {
      await markAffiliateCommissionPayoutAction({ commissionId, communityId, communitySlug, status });
    });
  }

  if (commissions.length === 0) {
    return (
      <div style={{
        padding: "30px 20px", textAlign: "center",
        color: "var(--text-muted)", fontSize: "var(--text-sm)",
        background: "var(--bg-card)", borderRadius: 8,
      }}>
        Chưa có commission nào.
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 8, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: GRID,
        padding: "8px 16px",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        {["Người mua", "Sản phẩm", "Hoa hồng", "Trạng thái", "Thao tác"].map((h) => (
          <div key={h} style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)" }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      {commissions.map((c) => (
        <div
          key={c.id}
          style={{
            display: "grid", gridTemplateColumns: GRID,
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {/* Người mua */}
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.referral.referredUser?.name || c.referral.referredUser?.email || "Ẩn danh"}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
              {fmtRelativeTime(c.createdAt)}
            </div>
          </div>

          {/* Sản phẩm */}
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.itemTitle || c.sourceType}
          </div>

          {/* Hoa hồng */}
          <div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--brand-green)" }}>
              +{fmtVnd(Number(c.commissionVnd ?? 0))}đ
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              / {fmtVnd(Number(c.grossAmountVnd ?? 0))}đ
            </div>
          </div>

          {/* Trạng thái */}
          <div>
            <PayoutBadge status={c.payoutStatus} />
          </div>

          {/* Thao tác */}
          <div style={{ display: "flex", gap: 8 }}>
            {c.payoutStatus === "UNPAID" && (
              <>
                <button
                  type="button" disabled={pending}
                  onClick={() => handlePayout(c.id, "PAID")}
                  style={{
                    padding: "4px 10px", borderRadius: 6,
                    border: "1px solid var(--brand-green)", background: "transparent",
                    color: "var(--brand-green)", fontSize: "var(--text-xs)", fontWeight: 600,
                    cursor: pending ? "not-allowed" : "pointer",
                  }}
                >
                  Thanh toán
                </button>
                <button
                  type="button" disabled={pending}
                  onClick={() => handlePayout(c.id, "REJECTED")}
                  style={{
                    padding: "4px 10px", borderRadius: 6,
                    border: "1px solid var(--danger)", background: "transparent",
                    color: "var(--danger)", fontSize: "var(--text-xs)", fontWeight: 600,
                    cursor: pending ? "not-allowed" : "pointer",
                  }}
                >
                  Từ chối
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
