import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LoginModal } from "@/components/shell/login-modal";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "💬",
    title: "Chat & Feed",
    desc: "Cộng đồng real-time với channels, bảng tin, và CỐT — các bài viết đỉnh cao.",
  },
  {
    icon: "⚔️",
    title: "Challenges",
    desc: "Thử thách nhóm có lộ trình 7-90 ngày với SOP, daily check-in, XP reward.",
  },
  {
    icon: "📚",
    title: "Khóa học",
    desc: "Hệ thống học tập có phases, pillars, và level tracking theo tier member.",
  },
  {
    icon: "🛒",
    title: "Marketplace",
    desc: "Mua templates, SOP packs, tools, prompts độc quyền từ creators.",
  },
  {
    icon: "🤖",
    title: "AI Agents",
    desc: "Agents kèm bạn 24/7 qua Telegram/Zalo — USP riêng của focus.camp.",
  },
  {
    icon: "🏆",
    title: "Gamification",
    desc: "XP, levels, streaks, badges, leaderboard. Học và ship được thưởng thật.",
  },
];

export default async function Home() {
  const session = await auth();
  const [userCount, communityCount, productCount, challengeCount] = await prisma.$transaction([
    prisma.user.count(),
    prisma.community.count(),
    prisma.product.count(),
    prisma.challenge.count(),
  ]);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* HERO */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #f7f2e8 0%, #ede5d0 50%, #e5ddc9 100%)",
          padding: "64px 32px 56px",
          textAlign: "center",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ fontSize: "var(--text-3xl)", marginBottom: 12 }}>🔥🏕️</div>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: 800,
            color: "var(--text-heading)",
            marginBottom: 10,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          focus.camp
        </h1>
        <p
          style={{
            fontSize: "var(--text-md)",
            color: "var(--text-muted)",
            maxWidth: 520,
            margin: "0 auto 24px",
            lineHeight: 1.5,
          }}
        >
          Cộng đồng builders, creators, founders Việt Nam — học bằng challenges,
          đồng hành bằng AI Agents, ship sản phẩm thực tế.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          {session?.user ? (
            <Link
              href="/discovery"
              style={{
                padding: "14px 28px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: "var(--text-base)",
                color: "#fff",
                background: "var(--brand-green)",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(27,158,117,0.3)",
              }}
            >
              Khám phá cộng đồng →
            </Link>
          ) : (
            <LoginModal
              trigger={
                <button
                  style={{
                    padding: "14px 28px",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: "var(--text-base)",
                    color: "#fff",
                    background: "var(--brand-green)",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(27,158,117,0.3)",
                  }}
                >
                  Bắt đầu ngay
                </button>
              }
            />
          )}
          <Link
            href="/discovery"
            style={{
              padding: "14px 28px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "var(--text-base)",
              color: "var(--text-heading)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              textDecoration: "none",
            }}
          >
            Khám phá
          </Link>
          <Link
            href="/pricing"
            style={{
              padding: "14px 28px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "var(--text-base)",
              color: "var(--text-heading)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              textDecoration: "none",
            }}
          >
            Pricing
          </Link>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 28,
            justifyContent: "center",
            flexWrap: "wrap",
            fontSize: "var(--text-sm)",
          }}
        >
          <Stat n={communityCount} label="Communities" />
          <Stat n={userCount} label="Members" />
          <Stat n={challengeCount} label="Challenges" />
          <Stat n={productCount} label="Products" />
        </div>
      </section>

      {/* FEATURES */}
      <section
        style={{
          padding: "48px 32px 32px",
          maxWidth: 1040,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 800,
              color: "var(--text-heading)",
              marginBottom: 6,
            }}
          >
            Tất cả trong 1 platform
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}>
            Chat, học, làm thử thách, mua tools, và đồng hành cùng AI — không
            cần rời tab.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ fontSize: "var(--text-2xl)", marginBottom: 8 }}>{f.icon}</div>
              <div
                style={{
                  fontWeight: 700,
                  color: "var(--text-heading)",
                  marginBottom: 4,
                  fontSize: "var(--text-md)",
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section
        style={{
          padding: "32px 32px 56px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: 28,
            borderRadius: 16,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "var(--text-2xl)", marginBottom: 8 }}>🚀</div>
          <h3
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 800,
              color: "var(--text-heading)",
              marginBottom: 6,
            }}
          >
            Sẵn sàng ship?
          </h3>
          <p
            style={{
              fontSize: "var(--text-base)",
              color: "var(--text-muted)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Tham gia free. Chọn challenge đầu tiên. Có AI đồng hành.
          </p>
          {session?.user ? (
            <Link
              href="/discovery"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: 10,
                fontWeight: 700,
                color: "#fff",
                background: "var(--brand-green)",
                textDecoration: "none",
              }}
            >
              Khám phá communities
            </Link>
          ) : (
            <LoginModal
              trigger={
                <button
                  style={{
                    padding: "12px 24px",
                    borderRadius: 10,
                    fontWeight: 700,
                    color: "#fff",
                    background: "var(--brand-green)",
                    border: "none",
                    fontSize: "var(--text-base)",
                  }}
                >
                  Đăng nhập với Google
                </button>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 800,
          color: "var(--text-heading)",
        }}
      >
        {n.toLocaleString("vi-VN")}
      </div>
      <div style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
