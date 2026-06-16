"use client";

import { fmtVnd, fmtRelativeTime } from "@/lib/brand";

interface ReferralRow {
  id: string;
  status: string;
  payoutStatus: string;
  commissionVnd: number | string | null;
  createdAt: Date | string;
  referredUser: { id: string; name: string | null; email: string | null } | null;
}

function PayoutBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PAID: { label: "Đã thanh toán", color: "var(--brand-green)", bg: "rgba(27,158,117,0.1)" },
    REJECTED: { label: "Từ chối", color: "var(--danger)", bg: "rgba(220,53,69,0.1)" },
    UNPAID: { label: "Chờ thanh toán", color: "var(--text-muted)", bg: "rgba(128,128,128,0.08)" },
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

export function CommunityAffiliateCard({
  community,
  link,
  referrals,
  stats,
}: {
  community: { id: string; name: string; slug: string; iconUrl: string | null };
  link: { id: string; code: string; clicks: number; createdAt: Date };
  referrals: ReferralRow[];
  stats: { clicks: number; signups: number; conversions: number; totalCommission: number } | null;
}) {
  if (!stats) return null;

  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <h3
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--header-primary)",
          marginBottom: 12,
        }}
      >
        Lịch sử referral
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <MiniStat label="Click" value={stats.clicks} />
        <MiniStat label="Đăng ký" value={stats.signups} />
        <MiniStat label="Chuyển đổi" value={stats.conversions} />
        <MiniStat label="Hoa hồng" value={`${fmtVnd(stats.totalCommission)}đ`} accent />
      </div>

      {referrals.length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: 8,
          }}
        >
          Chưa có referral nào.
        </div>
      ) : (
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
                  {r.referredUser?.name || r.referredUser?.email || "Ẩn danh"}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {fmtRelativeTime(r.createdAt)}
                </div>
              </div>
              {r.status === "CONVERTED" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 700,
                      color: "var(--brand-green)",
                    }}
                  >
                    +{fmtVnd(Number(r.commissionVnd ?? 0))}đ
                  </span>
                  <PayoutBadge status={r.payoutStatus} />
                </div>
              ) : (
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  Pending
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "var(--text-md)",
          fontWeight: 800,
          color: accent ? "var(--brand-green)" : "var(--header-primary)",
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
