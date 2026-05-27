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
    PAID: { label: "Da TT", color: "var(--brand-green)", bg: "rgba(27,158,117,0.1)" },
    REJECTED: { label: "Tu choi", color: "var(--danger)", bg: "rgba(220,53,69,0.1)" },
    UNPAID: { label: "Cho TT", color: "var(--text-muted)", bg: "rgba(128,128,128,0.08)" },
  };
  const s = map[status] ?? map.UNPAID;
  return (
    <span
      style={{
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        padding: "2px 8px",
        borderRadius: 4,
      }}
    >
      {s.label}
    </span>
  );
}

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
      await markAffiliateCommissionPayoutAction({
        commissionId,
        communityId,
        communitySlug,
        status,
      });
    });
  }

  if (commissions.length === 0) {
    return (
      <div
        style={{
          padding: "30px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "var(--text-sm)",
          border: "1px dashed var(--border-subtle)",
          borderRadius: 8,
        }}
      >
        Chua co commission nao.
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {commissions.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(27,158,117,0.04)",
            opacity: pending ? 0.6 : 1,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--header-primary)",
              }}
            >
              {c.referral.referredUser?.name || c.referral.referredUser?.email || "An danh"}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {fmtRelativeTime(c.createdAt)} - {c.sourceType}
              {c.itemTitle ? ` - ${c.itemTitle}` : ""}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  display: "block",
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  color: "var(--brand-green)",
                }}
              >
                +{fmtVnd(Number(c.commissionVnd ?? 0))}d
              </span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                tren {fmtVnd(Number(c.grossAmountVnd ?? 0))}d
              </span>
            </div>
            <PayoutBadge status={c.payoutStatus} />
            {c.payoutStatus === "UNPAID" && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handlePayout(c.id, "PAID")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--brand-green)",
                    background: "transparent",
                    color: "var(--brand-green)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    cursor: pending ? "not-allowed" : "pointer",
                  }}
                >
                  Thanh toan
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handlePayout(c.id, "REJECTED")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--danger)",
                    background: "transparent",
                    color: "var(--danger)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    cursor: pending ? "not-allowed" : "pointer",
                  }}
                >
                  Tu choi
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
