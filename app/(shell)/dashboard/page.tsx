import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOwnerOverview } from "@/lib/services/owner-dashboard";
import { fmtVnd } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — focus.camp",
};

export default async function DashboardPage() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");

  const rows = await getOwnerOverview(s.user.id);

  const totals = rows.reduce(
    (acc, r) => ({
      members: acc.members + r.memberCount,
      revenue: acc.revenue + r.revenueVnd30d,
      mrr: acc.mrr + r.mrrVnd,
    }),
    { members: 0, revenue: 0, mrr: 0 },
  );

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <header className="view-header">
        <span className="view-title">Dashboard</span>
        <span className="view-subtitle">
          Tổng quan {rows.length} cộng đồng bạn sở hữu
        </span>
      </header>
      <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: 1100, margin: "0 auto" }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              border: "1px dashed var(--border-subtle)",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏕️</div>
            <div style={{ fontWeight: 700, color: "var(--header-primary)", marginBottom: 4 }}>
              Bạn chưa sở hữu cộng đồng nào
            </div>
            <Link
              href="/discovery"
              style={{
                display: "inline-block",
                marginTop: 12,
                padding: "10px 18px",
                borderRadius: 8,
                background: "var(--brand-green)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Khám phá / tạo
            </Link>
          </div>
        ) : (
          <>
            {/* Totals */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Stat label="Communities" value={rows.length} />
              <Stat label="Members" value={totals.members} />
              <Stat label="MRR" value={`${fmtVnd(totals.mrr)}đ`} accent />
              <Stat label="Revenue 30d" value={`${fmtVnd(totals.revenue)}đ`} />
            </div>

            <h3
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--header-primary)",
                marginBottom: 12,
              }}
            >
              Communities
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/c/${r.slug}/settings`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 14,
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {r.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.iconUrl}
                      alt={r.name}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "var(--bg-elevated)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "var(--header-primary)",
                      }}
                    >
                      {r.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--header-primary)",
                        fontSize: "var(--text-md)",
                      }}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        marginTop: 2,
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>👥 {r.memberCount}</span>
                      <span>📝 {r.postCount30d} posts/30d</span>
                      <span>✓ {r.checkinCount30d} checkins/30d</span>
                      <span>💰 {fmtVnd(r.revenueVnd30d)}đ rev</span>
                      <span style={{ color: r.planState.status === "active" ? "var(--success)" : r.planState.status === "expired" ? "var(--danger)" : "var(--premium-gold)" }}>
                        {r.planLabel} · {r.planState.status}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--brand-green)",
                      fontSize: "var(--text-md)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtVnd(r.mrrVnd)}đ MRR
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
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
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "var(--text-xl)",
          fontWeight: 800,
          color: accent ? "var(--brand-green)" : "var(--header-primary)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
