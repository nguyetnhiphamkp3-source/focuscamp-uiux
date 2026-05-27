import { fmtVnd } from "@/lib/brand";
import { AffiliatesTable } from "./affiliates-table";
import { ReferralTable } from "./referral-table";

interface AffiliateItem {
  link: { id: string; code: string; clicks: number };
  user: { id: string; name: string | null; image: string | null };
  stats: { clicks: number; signups: number; conversions: number; totalCommission: number };
}

interface CommissionItem {
  id: string;
  createdAt: Date;
  sourceType: string;
  itemTitle: string | null;
  grossAmountVnd: number | string;
  commissionVnd: number | string;
  payoutStatus: string;
  payoutNote: string | null;
  referral: {
    referredUser: { id: string; name: string | null; image: string | null };
    link: { code: string; user: { id: string; name: string | null; image: string | null } };
  };
}

interface Totals {
  affiliates: number;
  referrals: number;
  conversions: number;
  totalCommission: number;
}

interface Props {
  communityId: string;
  communitySlug: string;
  affiliates: AffiliateItem[];
  commissions: CommissionItem[];
  totals: Totals;
}

const statCardStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 140,
  padding: "var(--space-4) var(--space-5)",
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--r-md)",
};

export function OwnerAffiliateDashboard({ communityId, communitySlug, affiliates, commissions, totals }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Stats row */}
      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-1)" }}>Affiliates</div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--header-primary)" }}>{totals.affiliates}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-1)" }}>Referrals</div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--header-primary)" }}>{totals.referrals}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-1)" }}>Conversions</div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--header-primary)" }}>{totals.conversions}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-1)" }}>Hoa hồng</div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--brand-green)" }}>{fmtVnd(totals.totalCommission)}đ</div>
        </div>
      </div>

      {/* Affiliates section */}
      <section>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--header-primary)", marginBottom: "var(--space-3)" }}>
          Affiliates ({totals.affiliates})
        </h2>
        <AffiliatesTable affiliates={affiliates} />
      </section>

      {/* Referrals section */}
      <section>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--header-primary)", marginBottom: "var(--space-3)" }}>
          Commissions ({totals.conversions})
        </h2>
        <ReferralTable commissions={commissions} communityId={communityId} communitySlug={communitySlug} />
      </section>
    </div>
  );
}
