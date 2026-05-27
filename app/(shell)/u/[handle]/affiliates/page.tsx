import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyReferrals } from "@/lib/services/affiliate";
import { resolveUserHandleParam, userProfilePath } from "@/lib/services/user";
import { fmtVnd } from "@/lib/brand";
import { CommunityAffiliateCard } from "@/components/affiliate/community-affiliate-card";

export const dynamic = "force-dynamic";

export default async function MyAffiliatesPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");

  const { handle } = await params;
  const requested = await resolveUserHandleParam(handle);
  if (!requested) notFound();

  const self = await resolveUserHandleParam(s.user.id);
  if (!self) redirect("/settings");

  if (requested.userId !== s.user.id) {
    redirect(userProfilePath(self, "/affiliates"));
  }
  if (requested.shouldRedirect) {
    redirect(userProfilePath(requested, "/affiliates"));
  }

  const communities = await listMyReferrals(s.user.id);

  // Aggregate totals across all communities
  const totals = communities.reduce(
    (acc, c) => ({
      clicks: acc.clicks + c.stats.clicks,
      signups: acc.signups + c.stats.signups,
      conversions: acc.conversions + c.stats.conversions,
      totalCommission: acc.totalCommission + c.stats.totalCommission,
    }),
    { clicks: 0, signups: 0, conversions: 0, totalCommission: 0 },
  );

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <header className="view-header">
        <span className="view-title">Affiliate</span>
        <span className="view-subtitle">Hoa hong tu link ban share</span>
      </header>
      <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: 880, margin: "0 auto" }}>
        {communities.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border-subtle)", borderRadius: 12 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#128279;</div>
            <div style={{ fontWeight: 700, color: "var(--header-primary)", marginBottom: 4 }}>
              Ban chua co affiliate link
            </div>
            <div style={{ fontSize: "var(--text-sm)" }}>
              Vao trang community bat ky, mo affiliate panel, tao link dau tien.
            </div>
          </div>
        ) : (
          <>
            {/* Aggregate stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: "var(--space-6)" }}>
              <Stat label="Click" value={totals.clicks} />
              <Stat label="Signup" value={totals.signups} />
              <Stat label="Conversion" value={totals.conversions} />
              <Stat label="Hoa hong" value={`${fmtVnd(totals.totalCommission)}d`} accent />
            </div>

            {/* Per-community cards */}
            {communities.map((c) => (
              <CommunityAffiliateCard
                key={c.community.id}
                community={c.community}
                link={c.link}
                referrals={c.referrals.map((r) => ({
                  id: r.id,
                  status: r.status,
                  payoutStatus: r.payoutStatus,
                  commissionVnd: r.commissionVnd ? Number(r.commissionVnd) : null,
                  createdAt: r.createdAt,
                  referredUser: r.referredUser,
                }))}
                stats={c.stats}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: accent ? "var(--brand-green)" : "var(--header-primary)", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
