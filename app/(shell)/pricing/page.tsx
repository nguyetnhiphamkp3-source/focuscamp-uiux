import Link from "next/link";
import { auth } from "@/auth";
import { fmtVnd } from "@/lib/brand";
import { DEFAULT_PLATFORM_PLAN_TIER, PLATFORM_PLANS } from "@/lib/platform-plans";
import { LoginModal } from "@/components/shell/login-modal";
import { CreateCommunityButton } from "@/components/shell/create-community-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing | focus.camp",
  description: "Gói Agency trả phí hàng tháng cho cộng đồng focus.camp",
};

export default async function PricingPage() {
  const session = await auth();
  const plan = PLATFORM_PLANS[DEFAULT_PLATFORM_PLAN_TIER];

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
          Mỗi cộng đồng = 1 gói Agency trả hàng tháng. Muốn nhiều cộng đồng?
          Mua nhiều lần. Hủy bất kỳ lúc nào, không ràng buộc dài hạn.
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
            gridTemplateColumns: "minmax(280px, 520px)",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "2px solid var(--brand-green)",
              borderRadius: 16,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              boxShadow: "0 8px 30px rgba(27,158,117,0.15)",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: 800,
                color: "var(--text-heading)",
                marginBottom: 8,
              }}
            >
              {plan.label}
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
                  fontSize: "var(--text-2xl)",
                  fontWeight: 800,
                  color: "var(--text-heading)",
                }}
              >
                {fmtVnd(plan.priceVnd)}đ
              </span>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                }}
              >
                /tháng
              </span>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px",
                flex: 1,
              }}
            >
              {plan.features.map((f, i) => (
                <li
                  key={i}
                  style={{
                    padding: "6px 0",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-normal)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: "var(--brand-green)", flexShrink: 0 }}>
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {session?.user ? (
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
            )}
          </div>
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
          q="Có gói thấp hơn Agency không?"
          a="Hiện tại focus.camp chỉ mở một gói Agency cho người tạo cộng đồng."
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
