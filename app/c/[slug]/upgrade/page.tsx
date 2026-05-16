export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTiersConfig, getUserTier } from "@/lib/services/subscription";
import type { TierConfigItem } from "@/lib/services/subscription";
import { TierSubscribeButton } from "./tier-subscribe-button";

function formatPrice(vnd: number) {
  return `${Math.round(vnd / 1000)}k/tháng`;
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
        <li
          key={r.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            padding: "3px 0",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span>{r.label}</span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function TierCard({
  tier,
  isCurrent,
  communityId,
  communitySlug,
}: {
  tier: TierConfigItem;
  isCurrent: boolean;
  communityId: string;
  communitySlug: string;
}) {
  return (
    <div
      style={{
        border: "2px solid var(--brand-green)",
        borderRadius: 14,
        padding: 20,
        background: "var(--bg-card)",
        display: "flex",
        flexDirection: "column",
        minWidth: 220,
        flex: "1 1 220px",
        maxWidth: 320,
      }}
    >
      <div style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", fontWeight: 700 }}>
        {tier.emoji ? `${tier.emoji} ` : ""}{tier.label}
      </div>

      {tier.priceVndMonthly != null && (
        <div
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 800,
            color: "var(--brand-green)",
            margin: "6px 0 4px",
            fontFamily: "var(--font-heading)",
          }}
        >
          {formatPrice(tier.priceVndMonthly)}
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
          <div
            style={{
              textAlign: "center",
              padding: "10px 0",
              background: "var(--bg-elevated)",
              borderRadius: 10,
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--brand-green)",
            }}
          >
            Gói hiện tại
          </div>
        ) : (
          <TierSubscribeButton
            communityId={communityId}
            communitySlug={communitySlug}
            tierKey={tier.key}
            priceVnd={tier.priceVndMonthly ?? 0}
            durationDays={30}
            label={`Nâng lên ${tier.label}`}
          />
        )}
      </div>
    </div>
  );
}

export default async function UpgradePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const tiersConfig = getTiersConfig(community.tiersConfig);
  const { tierKey: currentTierKey } = await getUserTier({
    userId: session.user.id,
    communityId: community.id,
  });

  const paidTiers = tiersConfig.filter((t) => !t.isFree);

  const currentTierLabel =
    tiersConfig.find((t) => t.key === currentTierKey)?.label ?? currentTierKey;

  return (
    <div style={{ padding: "var(--space-6)" }}>
      <header style={{ marginBottom: "var(--space-8)" }}>
        <Link
          href={`/c/${slug}`}
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 12,
          }}
        >
          ← Quay lại
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-xl)",
            fontWeight: 800,
            margin: 0,
          }}
        >
          Nâng cấp gói
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: "6px 0 0" }}>
          Gói hiện tại: <strong>{currentTierLabel}</strong>
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-6)",
          alignItems: "flex-start",
        }}
      >
        {paidTiers.map((tier) => (
          <TierCard
            key={tier.key}
            tier={tier}
            isCurrent={currentTierKey === tier.key}
            communityId={community.id}
            communitySlug={slug}
          />
        ))}
      </div>
    </div>
  );
}
