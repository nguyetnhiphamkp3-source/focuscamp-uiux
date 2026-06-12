import { fmtVnd } from "@/lib/brand";

interface AffiliateItem {
  link: { id: string; code: string; clicks: number };
  user: { id: string; name: string | null; image: string | null };
  stats: { clicks: number; signups: number; conversions: number; totalCommission: number };
}

interface Props {
  affiliates: AffiliateItem[];
}

const thStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
  fontWeight: 600,
  textAlign: "left",
  borderBottom: "1px solid var(--border-subtle)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-3)",
  fontSize: "var(--text-sm)",
  color: "var(--header-primary)",
  borderBottom: "1px solid var(--border-subtle)",
};

export function AffiliatesTable({ affiliates }: Props) {
  if (affiliates.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        Chưa có affiliate nào.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", borderRadius: "var(--r-md)", background: "var(--bg-card)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Affiliate</th>
            <th style={thStyle}>Mã</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Clicks</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Signups</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Conversions</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Hoa hồng</th>
          </tr>
        </thead>
        <tbody>
          {affiliates.map((a) => (
            <tr key={a.link.id}>
              <td style={tdStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {a.user.image ? (
                    <img
                      src={a.user.image}
                      alt=""
                      style={{ width: 24, height: 24, borderRadius: "50%" }}
                    />
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg-elevated)" }} />
                  )}
                  <span>{a.user.name || "—"}</span>
                </div>
              </td>
              <td style={tdStyle}>
                <code style={{ fontSize: "var(--text-xs)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "var(--r-sm)" }}>
                  {a.link.code}
                </code>
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{a.stats.clicks}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{a.stats.signups}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{a.stats.conversions}</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--brand-green)" }}>
                {fmtVnd(a.stats.totalCommission)}đ
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
