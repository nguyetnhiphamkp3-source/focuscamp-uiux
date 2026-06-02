import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtVnd } from "@/lib/brand";
import { TYPE_THUMB } from "@/components/marketplace/product-card";

const TYPE_BG: Record<string, string> = {
  TEMPLATE: "linear-gradient(135deg, #5b7ba3, #2d4b72)",
  SOP:      "linear-gradient(135deg, #7a9a5c, #4d6a33)",
  TOOL:     "linear-gradient(135deg, #9b6ba3, #6a3d72)",
  BUNDLE:   "linear-gradient(135deg, #c77a2d, #8a4f1e)",
  PROMPT:   "linear-gradient(135deg, #a3905b, #6c5c2d)",
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Marketplace — focus.camp",
  description:
    "Khám phá digital products + challenges từ tất cả community trên focus.camp",
};

type Tab = "products" | "challenges" | "courses";
type ProductType = "TEMPLATE" | "TOOL" | "BUNDLE" | "SOP" | "PROMPT";

export default async function GlobalMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab; q?: string; type?: ProductType }>;
}) {
  const { tab = "products", q, type } = await searchParams;

  const productWhere: Record<string, unknown> = { featuredOnGlobal: true };
  if (q) productWhere.title = { contains: q, mode: "insensitive" };
  if (type) productWhere.type = type;

  const challengeWhere: Record<string, unknown> = {
    featuredOnGlobal: true,
    status: { in: ["OPEN", "ACTIVE"] },
  };
  if (q) challengeWhere.title = { contains: q, mode: "insensitive" };

  const courseWhere: Record<string, unknown> = { featuredOnGlobal: true, isPublished: true };
  if (q) courseWhere.title = { contains: q, mode: "insensitive" };

  const [products, challenges, courses] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        community: { select: { slug: true, name: true, iconUrl: true } },
      },
    }),
    prisma.challenge.findMany({
      where: challengeWhere,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        community: { select: { slug: true, name: true, iconUrl: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.course.findMany({
      where: courseWhere,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        community: { select: { slug: true, name: true, iconUrl: true } },
        _count: { select: { lessons: true } },
      },
    }),
  ]);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <header className="view-header">
        <span className="view-title">Super Marketplace</span>
        <span className="view-subtitle">
          Digital products + challenges từ tất cả community
        </span>
      </header>

      <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: 1100, margin: "0 auto" }}>
        {/* Search bar */}
        <form method="GET" style={{ marginBottom: "var(--space-4)", display: "flex", gap: 8 }}>
          <input type="hidden" name="tab" value={tab} />
          {type && <input type="hidden" name="type" value={type} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Tìm kiếm sản phẩm, challenge, khoá học..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)",
              fontSize: "var(--text-sm)", color: "var(--text-body)", outline: "none",
            }}
          />
          <button type="submit" style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "var(--brand-green)", color: "#fff",
            fontWeight: 700, fontSize: "var(--text-sm)", cursor: "pointer",
          }}>
            Tìm
          </button>
          {q && (
            <Link href={`/marketplace?tab=${tab}`} style={{
              padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)", fontSize: "var(--text-sm)", textDecoration: "none",
              display: "flex", alignItems: "center",
            }}>✕</Link>
          )}
        </form>

        {/* Type filter — chỉ hiện ở tab products */}
        {tab === "products" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
            {[
              { value: undefined, label: "Tất cả" },
              { value: "TEMPLATE", label: "🎯 Template" },
              { value: "TOOL", label: "🧠 Tool" },
              { value: "BUNDLE", label: "📦 Bundle" },
              { value: "PROMPT", label: "💬 Prompt" },
              { value: "SOP", label: "👥 SOP" },
            ].map((f) => {
              const active = (f.value ?? "") === (type ?? "");
              const href = f.value
                ? `/marketplace?tab=products&type=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
                : `/marketplace?tab=products${q ? `&q=${encodeURIComponent(q)}` : ""}`;
              return (
                <Link key={f.label} href={href} style={{
                  padding: "6px 12px", borderRadius: 20,
                  border: `1px solid ${active ? "var(--brand-green)" : "var(--border-subtle)"}`,
                  background: active ? "var(--brand-green)" : "var(--bg-elevated)",
                  color: active ? "#fff" : "var(--text-muted)",
                  fontSize: "var(--text-xs)", fontWeight: 600, textDecoration: "none",
                }}>
                  {f.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginBottom: "var(--space-5)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <TabLink current={tab} to="products" label={`🛒 Products (${products.length})`} q={q} />
          <TabLink current={tab} to="courses" label={`📚 Courses (${courses.length})`} q={q} />
          <TabLink current={tab} to="challenges" label={`⚔️ Challenges (${challenges.length})`} q={q} />
        </div>

        {tab === "products" && (
          products.length === 0 ? (
            <Empty
              title="Chưa có product nào public"
              desc="Chủ community cần bật toggle 'Hiện global' trên sản phẩm của họ."
            />
          ) : (
            <div className="mk-grid">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/c/${p.community.slug}/marketplace/${p.slug}`}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "transform 150ms",
                  }}
                >
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", aspectRatio: "16 / 9",
                      background: TYPE_BG[p.type] ?? "linear-gradient(135deg, #a3905b, #6c5c2d)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 40,
                    }}>
                      {TYPE_THUMB[p.type]?.icon ?? "📦"}
                    </div>
                  )}
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <CommunityBadge community={p.community} />
                    <div style={{ fontWeight: 700, fontSize: "var(--text-md)", color: "var(--header-primary)", lineHeight: 1.3 }}>
                      {p.title}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description}
                      </div>
                    )}
                    <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, color: "var(--brand-green)" }}>
                        {p.isFree ? "Miễn phí" : `${fmtVnd(Number(p.priceVnd))}đ`}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        {p.soldCount} đã bán
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === "courses" && (
          courses.length === 0 ? (
            <Empty
              title="Chưa có khoá học nào public"
              desc="Chủ community cần publish course + bật toggle 'Hiện global' trong courses list."
            />
          ) : (
            <div className="mk-grid">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/c/${c.community.slug}/courses/${c.slug}`}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt={c.title}
                      style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        aspectRatio: "16 / 9",
                        background:
                          "linear-gradient(135deg, #5b7ba3, #2d4b72)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 36,
                      }}
                    >
                      📚
                    </div>
                  )}
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <CommunityBadge community={c.community} />
                    <div style={{ fontWeight: 700, fontSize: "var(--text-md)", color: "var(--header-primary)", lineHeight: 1.3 }}>
                      {c.title}
                    </div>
                    {c.description && (
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.description}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                      <span>📹 {c._count.lessons} bài</span>
                      <span>🎓 {c.level}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === "challenges" && (
          challenges.length === 0 ? (
            <Empty
              title="Chưa có challenge nào public"
              desc="Chủ community cần bật toggle 'Hiện trên Marketplace chung' trong Challenge settings."
            />
          ) : (
            <div className="mk-grid">
              {challenges.map((c) => (
                <Link
                  key={c.id}
                  href={`/c/${c.community.slug}/challenges/${c.slug}`}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "16 / 9",
                      backgroundImage: c.bannerUrl ? `url("${c.bannerUrl}")` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      background: c.bannerUrl
                        ? undefined
                        : c.difficulty === "HARD"
                          ? "linear-gradient(135deg, #d8955a 0%, #a35f2a 100%)"
                          : c.difficulty === "CHAOS"
                            ? "linear-gradient(135deg, #b8455a 0%, #7a2030 100%)"
                            : "linear-gradient(135deg, #5cb89a 0%, #3a8a70 100%)",
                      display: "flex",
                      alignItems: "flex-end",
                      padding: 14,
                      color: "#fff",
                      fontWeight: 700,
                      textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      fontSize: "var(--text-md)",
                      position: "relative",
                    }}
                  >
                    {c.bannerMediaType === "VIDEO" && (
                      <span className="ch-card-play-badge" aria-hidden="true">▶</span>
                    )}
                    {c.title}
                  </div>
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <CommunityBadge community={c.community} />
                    {c.description && (
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.description}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                      <span>⏱ {c.requiredDays} ngày</span>
                      <span>👥 {c._count.members} thành viên</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function TabLink({
  current,
  to,
  label,
  q,
}: {
  current: string;
  to: string;
  label: string;
  q?: string;
}) {
  const active = current === to;
  const href = `/marketplace?tab=${to}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <Link
      href={href}
      style={{
        padding: "10px 14px",
        borderBottom: `2px solid ${active ? "var(--brand-green)" : "transparent"}`,
        color: active ? "var(--header-primary)" : "var(--text-muted)",
        textDecoration: "none",
        fontWeight: active ? 700 : 500,
        fontSize: "var(--text-sm)",
        marginBottom: -1,
      }}
    >
      {label}
    </Link>
  );
}

function Empty({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
      <div style={{ fontWeight: 700, color: "var(--header-primary)", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: "var(--text-sm)" }}>{desc}</div>
    </div>
  );
}

function CommunityBadge({
  community,
}: {
  community: { slug: string; name: string; iconUrl: string | null };
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
      }}
    >
      {community.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={community.iconUrl}
          alt={community.name}
          style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontSize: 14 }}>🏕️</span>
      )}
      <span>{community.name}</span>
    </div>
  );
}
