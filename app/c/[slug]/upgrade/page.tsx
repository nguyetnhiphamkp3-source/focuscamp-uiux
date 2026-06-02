export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTiersConfig, getUserTier } from "@/lib/services/subscription";
import type { TierConfigItem } from "@/lib/services/subscription";
import { TierSubscribeButton } from "./tier-subscribe-button";

type BillingPeriod = "weekly" | "monthly" | "3months" | "6months" | "yearly";

const BILLING_OPTIONS: { key: BillingPeriod; label: string; days: number; badge?: string }[] = [
  { key: "weekly",   label: "1 tuần",   days: 7 },
  { key: "monthly",  label: "1 tháng",  days: 30 },
  { key: "3months",  label: "3 tháng",  days: 90,  badge: "Giảm 10%" },
  { key: "6months",  label: "6 tháng",  days: 180, badge: "Giảm 20%" },
  { key: "yearly",   label: "1 năm",    days: 365, badge: "Tốt nhất" },
];

function getPriceForPeriod(tier: TierConfigItem, period: BillingPeriod): number | null {
  switch (period) {
    case "weekly":   return tier.priceVndWeekly ?? null;
    case "monthly":  return tier.priceVndMonthly ?? null;
    case "3months":  return (tier as Record<string, unknown>).priceVnd3Months as number ?? null;
    case "6months":  return (tier as Record<string, unknown>).priceVnd6Months as number ?? null;
    case "yearly":   return tier.priceVndYearly ?? null;
  }
}

function fmtVnd(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`
    : `${Math.round(n / 1000)}k`;
}

function GateList({ tier }: { tier: TierConfigItem }) {
  const g = tier.gates;
  if (!g) return null;
  const rows: { label: string; value: string }[] = [];
  if (g.challengeDifficulty?.length)
    rows.push({ label: "Challenge", value: g.challengeDifficulty.join(", ") });
  if (g.courseLevel?.length)
    rows.push({ label: "Course", value: g.courseLevel.join(", ") });
  rows.push({ label: "Q&A/tuần", value: g.qaPerWeek != null ? String(g.qaPerWeek) : "∞" });
  if (g.marketplaceDiscount != null && g.marketplaceDiscount > 0)
    rows.push({ label: "Marketplace", value: `−${g.marketplaceDiscount}%` });
  rows.push({ label: "AI Agent", value: g.aiAgentAccess ? "✅" : "❌" });
  rows.push({ label: "Mentor 1-on-1", value: g.mentorBooking ? "✅" : "❌" });

  return (
    <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
      {rows.map((r) => (
        <li key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", color: "var(--text-muted)", padding: "4px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <span>{r.label}</span>
          <span style={{ fontWeight: 600, color: "var(--text-heading)" }}>{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function TierCard({
  tier, isCurrent, communityId, communitySlug, billing,
}: {
  tier: TierConfigItem; isCurrent: boolean;
  communityId: string; communitySlug: string; billing: BillingPeriod;
}) {
  const price = getPriceForPeriod(tier, billing);
  const opt = BILLING_OPTIONS.find((o) => o.key === billing)!;

  return (
    <div style={{ border: "2px solid var(--brand-green)", borderRadius: 14, padding: 20, background: "var(--bg-card)", display: "flex", flexDirection: "column", minWidth: 220, flex: "1 1 220px", maxWidth: 360 }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", fontWeight: 700 }}>
        {tier.emoji ? `${tier.emoji} ` : ""}{tier.label}
      </div>

      {price != null ? (
        <div style={{ margin: "8px 0 4px" }}>
          <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--brand-green)", fontFamily: "var(--font-heading)" }}>
            {fmtVnd(price)}đ
          </span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: 4 }}>
            / {opt.label}
          </span>
        </div>
      ) : (
        <div style={{ margin: "8px 0 4px", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Không có gói {opt.label}
        </div>
      )}

      {tier.description && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: "4px 0 0" }}>
          {tier.description}
        </p>
      )}

      <GateList tier={tier} />

      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        {isCurrent ? (
          <div style={{ textAlign: "center", padding: "10px 0", background: "var(--bg-elevated)", borderRadius: 10, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--brand-green)" }}>
            Gói hiện tại
          </div>
        ) : price != null ? (
          <TierSubscribeButton
            communityId={communityId}
            communitySlug={communitySlug}
            tierKey={tier.key}
            priceVnd={price}
            durationDays={opt.days}
            label={`Nâng lên ${tier.label}`}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0", background: "var(--bg-elevated)", borderRadius: 10, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Không khả dụng
          </div>
        )}
      </div>
    </div>
  );
}

export default async function UpgradePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ billing?: string }>;
}) {
  const { slug } = await params;
  const { billing: rawBilling } = await searchParams;
  const billing: BillingPeriod =
    (BILLING_OPTIONS.find((o) => o.key === rawBilling)?.key) ?? "monthly";

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const tiersConfig = getTiersConfig(community.tiersConfig);
  const { tierKey: currentTierKey } = await getUserTier({ userId: session.user.id, communityId: community.id });
  const paidTiers = tiersConfig.filter((t) => !t.isFree);
  const currentTierLabel = tiersConfig.find((t) => t.key === currentTierKey)?.label ?? currentTierKey;

  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 800, margin: "0 auto" }}>
      <header style={{ marginBottom: "var(--space-6)" }}>
        <Link href={`/c/${slug}`} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
          ← Quay lại
        </Link>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", fontWeight: 800, margin: 0 }}>
          Nâng cấp gói
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: "6px 0 0" }}>
          Gói hiện tại: <strong>{currentTierLabel}</strong>
        </p>
      </header>

      {/* Billing period selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--space-6)" }}>
        {BILLING_OPTIONS.map((opt) => {
          const active = opt.key === billing;
          return (
            <Link
              key={opt.key}
              href={`/c/${slug}/upgrade?billing=${opt.key}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999,
                border: `2px solid ${active ? "var(--brand-green)" : "var(--border-subtle)"}`,
                background: active ? "var(--brand-green)" : "var(--bg-elevated)",
                color: active ? "#fff" : "var(--text-muted)",
                fontWeight: active ? 700 : 500,
                fontSize: "var(--text-sm)",
                textDecoration: "none",
                transition: "all 150ms",
              }}
            >
              {opt.label}
              {opt.badge && (
                <span style={{
                  fontSize: "var(--text-xs)", fontWeight: 700,
                  background: active ? "rgba(255,255,255,0.25)" : "var(--brand-green)",
                  color: active ? "#fff" : "#fff",
                  padding: "2px 6px", borderRadius: 999,
                }}>
                  {opt.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tier cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-start" }}>
        {paidTiers.map((tier) => (
          <TierCard
            key={tier.key}
            tier={tier}
            isCurrent={currentTierKey === tier.key}
            communityId={community.id}
            communitySlug={slug}
            billing={billing}
          />
        ))}
      </div>
    </div>
  );
}
