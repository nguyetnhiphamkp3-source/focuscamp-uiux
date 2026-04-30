import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyReferrals } from "@/lib/services/affiliate";
import { fmtVnd, fmtRelativeTime } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function MyAffiliatesPage() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");

  const data = await listMyReferrals(s.user.id);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <header className="view-header">
        <span className="view-title">Affiliate</span>
        <span className="view-subtitle">
          Hoa hồng từ link bạn share
        </span>
      </header>
      <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: 880, margin: "0 auto" }}>
        {!data.link ? (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              border: "1px dashed var(--border-subtle)",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
            <div style={{ fontWeight: 700, color: "var(--header-primary)", marginBottom: 4 }}>
              Bạn chưa có affiliate link
            </div>
            <div style={{ fontSize: "var(--text-sm)" }}>
              Vào trang community bất kỳ → mở affiliate panel → tạo link đầu tiên.
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Stat label="Click" value={data.stats?.clicks ?? 0} />
              <Stat label="Signup" value={data.stats?.signups ?? 0} />
              <Stat label="Conversion" value={data.stats?.conversions ?? 0} />
              <Stat
                label="Hoa hồng"
                value={`${fmtVnd(data.stats?.totalCommission ?? 0)}đ`}
                accent
              />
            </div>

            <h3
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--header-primary)",
                marginBottom: 10,
              }}
            >
              Lịch sử referral
            </h3>

            {data.referrals.length === 0 ? (
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
                Chưa có ai signup qua link của bạn.
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {data.referrals.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border-subtle)",
                      background:
                        r.status === "CONVERTED"
                          ? "rgba(27,158,117,0.04)"
                          : "transparent",
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
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {fmtRelativeTime(r.createdAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 700,
                        color:
                          r.status === "CONVERTED"
                            ? "var(--brand-green)"
                            : "var(--text-muted)",
                      }}
                    >
                      {r.status === "CONVERTED"
                        ? `+${fmtVnd(Number(r.commissionVnd ?? 0))}đ`
                        : "Pending"}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
