import Link from "next/link";
import { auth } from "@/auth";
import { fmtVnd } from "@/lib/brand";
import {
  DEFAULT_PLATFORM_PLAN_TIER,
  DISPLAY_PLATFORM_PLAN_TIERS,
  PLATFORM_PLAN_DISPLAY,
  PLATFORM_PLANS,
} from "@/lib/platform-plans";
import { LoginModal } from "@/components/shell/login-modal";
import { CreateCommunityButton } from "@/components/shell/create-community-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing | focus.camp",
  description: "Gói trả phí hàng tháng cho cộng đồng focus.camp",
};

export default async function PricingPage() {
  const session = await auth();

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* HERO */}
      <section
        style={{
          padding: "56px 32px 24px",
          textAlign: "center",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: 800,
            color: "var(--text-heading)",
            marginBottom: 12,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Gói cho cộng đồng của bạn
        </h1>
        <p
          style={{
            fontSize: "var(--text-md)",
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          Agency đang mở đăng ký. Solo và Pro sẽ được mở sau.
          Mỗi cộng đồng cần 1 gói trả phí riêng.
        </p>
      </section>

      {/* PRICING GRID */}
      <section
        style={{
          padding: "0 32px 48px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {DISPLAY_PLATFORM_PLAN_TIERS.map((tier) => {
            const option = PLATFORM_PLAN_DISPLAY[tier];
            const plan = PLATFORM_PLANS[tier];
            const available = option.available;
            const isFeatured = tier === DEFAULT_PLATFORM_PLAN_TIER;
            return (
              <div
                key={tier}
                style={{
                  background: isFeatured ? "var(--bg-card)" : "var(--bg-elevated)",
                  border: `2px solid ${isFeatured ? "var(--brand-green)" : "var(--border-subtle)"}`,
                  borderRadius: 16,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: isFeatured ? "0 8px 30px rgba(27,158,117,0.15)" : "none",
                  opacity: available ? 1 : 0.68,
                }}
              >
                {option.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -12,
                      left: 28,
                      padding: "4px 12px",
                      borderRadius: 999,
                      background: "var(--bg-card)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {option.badge}
                  </span>
                )}
                <div
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: 800,
                    color: "var(--text-heading)",
                    marginBottom: 8,
                  }}
                >
                  {option.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: available ? "var(--text-2xl)" : "var(--text-xl)",
                      fontWeight: 800,
                      color: available ? "var(--text-heading)" : "var(--text-muted)",
                    }}
                  >
                    {available ? `${fmtVnd(plan.priceVnd)}đ` : "Coming soon"}
                  </span>
                  {available && (
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--text-muted)",
                      }}
                    >
                      /tháng
                    </span>
                  )}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 24px",
                    flex: 1,
                  }}
                >
                  {(available
                    ? plan.features
                    : ["Đang hoàn thiện", "Sẽ mở đăng ký sau", "Nhận thông báo khi ra mắt"]
                  ).map((f, i) => (
                    <li
                      key={i}
                      style={{
                        padding: "6px 0",
                        fontSize: "var(--text-sm)",
                        color: available ? "var(--text-normal)" : "var(--text-muted)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: available ? "var(--brand-green)" : "var(--text-muted)", flexShrink: 0 }}>
                        {available ? "✓" : "·"}
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {available ? (
                  session?.user ? (
                    <CreateCommunityButton variant="inline" />
                  ) : (
                    <LoginModal
                      trigger={
                        <button
                          style={{
                            padding: "12px 22px",
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: "var(--text-sm)",
                            color: "#fff",
                            background: "var(--brand-green)",
                            border: `1px solid var(--brand-green)`,
                            cursor: "pointer",
                          }}
                        >
                          Bắt đầu →
                        </button>
                      }
                    />
                  )
                ) : (
                  <button
                    type="button"
                    disabled
                    style={{
                      padding: "12px 22px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "var(--text-sm)",
                      color: "var(--text-muted)",
                      background: "var(--bg-modifier-hover)",
                      border: "1px solid var(--border-subtle)",
                      cursor: "not-allowed",
                    }}
                  >
                    Coming soon
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          padding: "32px 32px 64px",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 800,
            color: "var(--text-heading)",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Câu hỏi thường gặp
        </h2>
        <Faq
          q="Tham gia cộng đồng có mất phí không?"
          a="Tham gia với tư cách thành viên là MIỄN PHÍ. Phí gói chỉ áp dụng cho người tạo (owner) cộng đồng."
        />
        <Faq
          q="Tôi có thể tạo nhiều cộng đồng không?"
          a="Có. Mỗi cộng đồng cần 1 gói trả phí riêng. Owner có thể tạo n cộng đồng = mua n gói."
        />
        <Faq
          q="Hết hạn thì sao?"
          a="Có 7 ngày grace để gia hạn. Hết grace, cộng đồng chuyển read-only — thành viên xem được nội dung cũ nhưng không đăng/check-in được. Gia hạn bất kỳ lúc nào để mở lại."
        />
        <Faq
          q="Hoàn tiền thế nào?"
          a={
            <>
              Hoàn 100% trong 7 ngày nếu chưa có hoạt động. Xem chi tiết{" "}
              <Link
                href="/refund"
                style={{ color: "var(--brand-green)", textDecoration: "underline" }}
              >
                tại đây
              </Link>
              .
            </>
          }
        />
        <Faq
          q="Solo và Pro dùng được chưa?"
          a="Chưa. Hai gói này đang ở trạng thái coming soon; hiện chỉ gói Agency mở đăng ký."
        />
        <Faq
          q="Thanh toán qua đâu?"
          a="VietQR — quét bằng app ngân hàng VN bất kỳ. Webhook SePay tự match giao dịch trong ~30 giây."
        />
      </section>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 8,
      }}
    >
      <summary
        style={{
          fontWeight: 600,
          color: "var(--header-primary)",
          cursor: "pointer",
          fontSize: "var(--text-base)",
        }}
      >
        {q}
      </summary>
      <div
        style={{
          marginTop: 8,
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        {a}
      </div>
    </details>
  );
}
