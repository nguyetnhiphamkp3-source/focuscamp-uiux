"use client";

import { useTransition } from "react";
import { markReferralPayoutAction } from "@/app/actions/affiliate";
import { fmtVnd, fmtRelativeTime } from "@/lib/brand";

interface ReferralRow {
  id: string;
  status: string;
  payoutStatus: string;
  payoutNote: string | null;
  commissionVnd: number | string | null;
  createdAt: Date | string;
  referredUser: { id: string; name: string | null; email?: string | null; image: string | null } | null;
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
  referrals,
  communityId,
  communitySlug,
}: {
  referrals: ReferralRow[];
  communityId: string;
  communitySlug: string;
}) {
  const [pending, start] = useTransition();

  function handlePayout(referralId: string, status: "PAID" | "REJECTED") {
    start(async () => {
      await markReferralPayoutAction({
        referralId,
        communityId,
        communitySlug,
        status,
      });
    });
  }

  if (referrals.length === 0) {
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
        Chua co referral nao.
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
      {referrals.map((r) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-subtle)",
            background:
              r.status === "CONVERTED" ? "rgba(27,158,117,0.04)" : "transparent",
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
              {r.referredUser?.name || r.referredUser?.email || "An danh"}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {fmtRelativeTime(r.createdAt)} — {r.status}
            </div>
          </div>

          {r.status === "CONVERTED" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  color: "var(--brand-green)",
                }}
              >
                +{fmtVnd(Number(r.commissionVnd ?? 0))}d
              </span>
              <PayoutBadge status={r.payoutStatus} />
              {r.payoutStatus === "UNPAID" && (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handlePayout(r.id, "PAID")}
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
                    onClick={() => handlePayout(r.id, "REJECTED")}
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
          )}

          {r.status !== "CONVERTED" && (
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {r.status === "SUSPICIOUS" ? "Nghi ngo" : "Pending"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
