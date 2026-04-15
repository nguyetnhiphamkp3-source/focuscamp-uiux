import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Tất cả",
  "Business & Founder",
  "Marketing & Traffic",
  "Ecommerce",
  "Developer",
  "Content Creator",
  "Investing",
  "AI & Tech",
  "Fitness & Health",
];

const BANNER_GRADIENTS = [
  "linear-gradient(135deg,#c77a2d,#8a4f1e)",
  "linear-gradient(135deg,#5865F2,#eb459e)",
  "linear-gradient(135deg,#1abc9c,#0d7c62)",
  "linear-gradient(135deg,#9b59b6,#6a3d72)",
  "linear-gradient(135deg,#f39c12,#d35400)",
  "linear-gradient(135deg,#2ecc71,#16a085)",
];

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default async function DiscoveryPage() {
  const [communities, challenges, totals] = await Promise.all([
    prisma.community.findMany({
      take: 24,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, challenges: true, courses: true } },
      },
    }),
    prisma.challenge.findMany({
      take: 6,
      where: { status: { in: ["OPEN", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
      include: {
        community: { select: { name: true, slug: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.$transaction([
      prisma.community.count(),
      prisma.challenge.count({ where: { status: { in: ["OPEN", "ACTIVE"] } } }),
      prisma.user.count(),
      prisma.product.count(),
    ]),
  ]);

  const [communityCount, challengeCount, memberCount, productCount] = totals;

  return (
    <div className="dc-view">
      <div className="dc-inner">
        <div style={{ marginBottom: 16 }}>
          <Link href="/" className="text-sm" style={{ color: "var(--text-link)" }}>
            ← Về trang chủ
          </Link>
        </div>

        {/* Hero */}
        <section className="dc-hero">
          <div className="dc-hero-title">🔭 Discover — Cross-community marketplace</div>
          <div className="dc-hero-desc">
            Tìm cộng đồng phù hợp, tham gia challenge mới, mua products độc quyền từ
            creators trên toàn focus.camp — một cửa sổ duy nhất.
          </div>
          <div className="dc-hero-stats">
            <div className="dc-hero-stat">
              <strong>{communityCount.toLocaleString("vi-VN")}</strong>
              <span>Communities</span>
            </div>
            <div className="dc-hero-stat">
              <strong>{productCount.toLocaleString("vi-VN")}</strong>
              <span>Products</span>
            </div>
            <div className="dc-hero-stat">
              <strong>{challengeCount.toLocaleString("vi-VN")}</strong>
              <span>Active challenges</span>
            </div>
            <div className="dc-hero-stat">
              <strong>{memberCount.toLocaleString("vi-VN")}</strong>
              <span>Active members</span>
            </div>
          </div>
        </section>

        {/* Search */}
        <div className="dc-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-muted)" }}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input type="text" placeholder="Tìm communities, challenges, products…" />
        </div>

        {/* Categories */}
        <div className="dc-categories">
          {CATEGORIES.map((c, i) => (
            <div key={c} className={`dc-cat ${i === 0 ? "active" : ""}`}>
              {c}
            </div>
          ))}
        </div>

        {/* Featured communities */}
        <div className="dc-section-head">
          <h2>🌟 Featured Communities</h2>
          <span className="see-all">Xem tất cả →</span>
        </div>

        {communities.length === 0 ? (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏜️</div>
            Chưa có community nào.
          </div>
        ) : (
          <div className="dc-communities-grid">
            {communities.map((c, idx) => {
              const badge =
                c._count.memberships >= 100
                  ? "hot"
                  : idx < 2
                    ? "verified"
                    : "new";
              const badgeLabel =
                badge === "hot" ? "🔥 Hot" : badge === "verified" ? "✓ Verified" : "NEW";
              return (
                <Link
                  key={c.id}
                  href={`/c/${c.slug}`}
                  className="dc-community"
                >
                  <div
                    className="dc-community-banner"
                    style={{ background: BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length] }}
                  >
                    {initials(c.name)}
                    <span className={`dc-community-badge ${badge}`}>{badgeLabel}</span>
                  </div>
                  <div className="dc-community-body">
                    <div className="dc-community-name">{c.name}</div>
                    <div className="dc-community-desc">
                      {c.tagline || c.description || "Community trên focus.camp."}
                    </div>
                    <div className="dc-community-stats">
                      <span className="dot" />
                      <span>
                        <strong>{c.onlineCount}</strong> online
                      </span>
                      <span className="sep">·</span>
                      <span>
                        <strong>{c._count.memberships}</strong> members
                      </span>
                      <span className="sep">·</span>
                      <span>
                        <strong>{c._count.challenges}</strong> challenges
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Trending Challenges */}
        {challenges.length > 0 && (
          <>
            <div className="dc-section-head">
              <h2>⚔️ Trending Challenges</h2>
              <span className="see-all">Xem tất cả →</span>
            </div>
            <div className="ch-grid">
              {challenges.map((ch) => {
                const diff =
                  ch.difficulty === "HARD"
                    ? "diff-hard"
                    : ch.difficulty === "CHAOS"
                      ? "diff-chaos"
                      : "diff-normal";
                const diffLabel =
                  ch.difficulty === "HARD"
                    ? "⚔️ Hard"
                    : ch.difficulty === "CHAOS"
                      ? "🔥 Chaos"
                      : "🛡️ Normal";
                const statusClass = ch.status === "ACTIVE" ? "active" : "open";
                return (
                  <div key={ch.id} className="ch-card">
                    <div className={`ch-card-banner ${diff}`}>
                      <span className="ch-diff-badge">{diffLabel}</span>
                      <span className={`ch-status-badge ${statusClass}`}>
                        {ch.status}
                      </span>
                      <div className="ch-card-banner-title">{ch.title}</div>
                    </div>
                    <div className="ch-card-body">
                      <div className="ch-card-desc">
                        {ch.description || "Challenge trong focus.camp."}
                      </div>
                      <div className="ch-card-meta">
                        <span style={{ fontSize: 11 }}>bởi</span>
                        <span style={{ fontWeight: 600, color: "var(--text-heading)" }}>
                          {ch.community.name}
                        </span>
                        <span className="meta-sep">·</span>
                        <span>{ch._count.members} joined</span>
                      </div>
                      <Link
                        href={`/c/${ch.community.slug}`}
                        className="ch-card-cta"
                      >
                        Khám phá
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
