"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeCommunityTierAction } from "@/app/actions/community";
import type { TierConfigItem } from "@/lib/services/subscription";

type BillingPeriod = "weekly" | "monthly" | "3months" | "6months" | "yearly";

const BILLING_OPTIONS: { key: BillingPeriod; label: string; days: number; badge?: string }[] = [
  { key: "weekly",  label: "1 tuần",  days: 7 },
  { key: "monthly", label: "1 tháng", days: 30 },
  { key: "3months", label: "3 tháng", days: 90,  badge: "Giảm 10%" },
  { key: "6months", label: "6 tháng", days: 180, badge: "Giảm 20%" },
  { key: "yearly",  label: "1 năm",   days: 365, badge: "Tốt nhất" },
];

function fmtVnd(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`
    : `${Math.round(n / 1000)}k`;
}

function getPriceForPeriod(tier: TierConfigItem, period: BillingPeriod): number | null {
  const t = tier as Record<string, unknown>;
  switch (period) {
    case "weekly":  return (tier.priceVndWeekly ?? null) as number | null;
    case "monthly": return (tier.priceVndMonthly ?? null) as number | null;
    case "3months": return (t.priceVnd3Months ?? null) as number | null;
    case "6months": return (t.priceVnd6Months ?? null) as number | null;
    case "yearly":  return (tier.priceVndYearly ?? null) as number | null;
  }
}

function SubscribeBtn({ communityId, communitySlug, tierKey, priceVnd, durationDays, label }: {
  communityId: string; communitySlug: string; tierKey: string;
  priceVnd: number; durationDays: number; label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => {
        const res = await subscribeCommunityTierAction({ communityId, communitySlug, tierKey, priceVnd, durationDays });
        if (res.ok) router.push(`/pay/${res.paymentCode}?return=/c/${communitySlug}`);
        else alert("Lỗi: " + res.reason);
      })}
      style={{
        width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
        background: pending ? "rgba(27,158,117,0.5)" : "var(--brand-green)",
        color: "#fff", fontWeight: 700, fontSize: "var(--text-sm)",
        cursor: pending ? "not-allowed" : "pointer", marginTop: 8,
      }}
    >
      {pending ? "Đang xử lý..." : label}
    </button>
  );
}

export function UpgradeModalContent({
  tiers,
  currentTierKey,
  currentTierLabel,
  communityId,
  communitySlug,
}: {
  tiers: TierConfigItem[];
  currentTierKey: string;
  currentTierLabel: string;
  communityId: string;
  communitySlug: string;
}) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const opt = BILLING_OPTIONS.find((o) => o.key === billing)!;

  return (
    <div>
      {/* Current tier */}
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 14 }}>
        Gói hiện tại: <strong style={{ color: "var(--text-normal)" }}>{currentTierLabel}</strong>
      </div>

      {/* Billing selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {BILLING_OPTIONS.map((o) => {
          const active = o.key === billing;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setBilling(o.key)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 10,
                border: `2px solid ${active ? "var(--brand-green)" : "rgba(0,0,0,0.12)"}`,
                background: active ? "var(--brand-green)" : "transparent",
                color: active ? "#fff" : "var(--text-muted)",
                fontWeight: active ? 700 : 400,
                fontSize: "var(--text-xs)",
                cursor: "pointer",
              }}
            >
              {o.label}
              {o.badge && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: active ? "rgba(255,255,255,0.25)" : "var(--brand-green)",
                  color: "#fff", padding: "1px 5px", borderRadius: 999,
                }}>
                  {o.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tier cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {tiers.map((tier) => {
          const price = getPriceForPeriod(tier, billing);
          const isCurrent = currentTierKey === tier.key;
          const g = tier.gates;
          const rows: { label: string; value: string }[] = [];
          if (g?.challengeDifficulty?.length) rows.push({ label: "Thử thách", value: g.challengeDifficulty.join(", ") });
          if (g?.courseLevel?.length) rows.push({ label: "Khoá học", value: g.courseLevel.join(", ") });
          rows.push({ label: "Q&A/tuần", value: g?.qaPerWeek != null ? String(g.qaPerWeek) : "∞" });
          if (g?.marketplaceDiscount) rows.push({ label: "Cửa hàng", value: `−${g.marketplaceDiscount}%` });
          rows.push({ label: "AI Agent", value: g?.aiAgentAccess ? "✅" : "❌" });
          rows.push({ label: "Mentor 1-on-1", value: g?.mentorBooking ? "✅" : "❌" });

          return (
            <div key={tier.key} style={{
              flex: "1 1 200px", border: "2px solid var(--brand-green)",
              borderRadius: 12, padding: 16, background: "var(--bg-card)",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--header-primary)", marginBottom: 4 }}>
                {tier.emoji ? `${tier.emoji} ` : ""}{tier.label}
              </div>
              {price != null ? (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--brand-green)" }}>
                    {fmtVnd(price)}đ
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 4 }}>
                    / {opt.label}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Không có gói {opt.label}</div>
              )}
              {tier.description && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "4px 0 8px", lineHeight: 1.5 }}>
                  {tier.description}
                </p>
              )}
              <ul style={{ margin: "0 0 12px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0 }}>
                {rows.map((r) => (
                  <li key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <span>{r.label}</span>
                    <span style={{ fontWeight: 600, color: "var(--text-normal)" }}>{r.value}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "auto" }}>
                {isCurrent ? (
                  <div style={{ textAlign: "center", padding: "8px 0", background: "rgba(27,158,117,0.1)", borderRadius: 8, fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--brand-green)" }}>
                    Gói hiện tại
                  </div>
                ) : price != null ? (
                  <SubscribeBtn
                    communityId={communityId} communitySlug={communitySlug}
                    tierKey={tier.key} priceVnd={price} durationDays={opt.days}
                    label={`Nâng lên ${tier.label}`}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "8px 0", background: "var(--bg-elevated)", borderRadius: 8, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Không khả dụng
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
