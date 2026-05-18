import Link from "next/link";
import { searchAll } from "@/lib/services/search";
import { auth } from "@/auth";
import {
  avatarColorFor,
  initials,
  fmtRelativeTime,
} from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tìm kiếm — focus.camp" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const query = (sp.q ?? "").trim();
  const results = query.length >= 2
    ? await searchAll({ query, viewerId: session?.user?.id })
    : null;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-6) var(--space-6) var(--space-10)",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 700,
            margin: 0,
            color: "var(--header-primary)",
          }}
        >
          Tìm kiếm
        </h1>
        <form action="/search" method="get" style={{ margin: "var(--space-4) 0" }}>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Tìm bài viết, người, cộng đồng…"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-normal)",
              fontSize: "var(--text-md)",
              outline: "none",
            }}
          />
        </form>

        {query.length > 0 && query.length < 2 && (
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              padding: "var(--space-4) 0",
            }}
          >
            Nhập tối thiểu 2 ký tự
          </div>
        )}

        {results && (
          <>
            {/* Communities */}
            {results.communities.length > 0 && (
              <Section title={`Cộng đồng (${results.communities.length})`}>
                {results.communities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${c.slug}`}
                    style={resultCardStyle}
                  >
                    {c.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.iconUrl}
                        alt=""
                        style={iconStyle}
                      />
                    ) : (
                      <div
                        style={{
                          ...iconStyle,
                          background: avatarColorFor(c.id),
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        {initials(c.name)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={cardTitleStyle}>{c.name}</div>
                      {c.tagline && (
                        <div style={cardSubStyle}>{c.tagline}</div>
                      )}
                      <div style={cardMetaStyle}>
                        {c.memberCount} thành viên · /c/{c.slug}
                      </div>
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {/* Users */}
            {results.users.length > 0 && (
              <Section title={`Người dùng (${results.users.length})`}>
                {results.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/u/${u.handle ?? u.id}`}
                    style={resultCardStyle}
                  >
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" style={iconStyle} />
                    ) : (
                      <div
                        style={{
                          ...iconStyle,
                          background: avatarColorFor(u.id),
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        {initials(u.name ?? "?")}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={cardTitleStyle}>
                        {u.name ?? "Ẩn danh"}
                      </div>
                      {u.handle && (
                        <div style={cardSubStyle}>@{u.handle}</div>
                      )}
                      {u.bio && <div style={cardMetaStyle}>{u.bio}</div>}
                      <div style={cardMetaStyle}>
                        Thuộc {u._count.memberships} cộng đồng
                      </div>
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {/* Posts */}
            {results.posts.length > 0 && (
              <Section title={`Bài viết (${results.posts.length})`}>
                {results.posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/c/${p.community.slug}/p/${p.id}`}
                    style={resultCardStyle}
                  >
                    <div style={{ fontSize: 20, flexShrink: 0 }}>
                      {p.type === "QUESTION" ? "❓" : p.type === "SIGNAL" ? "⚡" : "📝"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={cardTitleStyle}>
                        {p.title ||
                          p.body.slice(0, 80) +
                            (p.body.length > 80 ? "…" : "")}
                      </div>
                      <div style={cardMetaStyle}>
                        bởi {p.user.name ?? "Ẩn danh"} ·{" "}
                        {p.community.name} · {fmtRelativeTime(p.createdAt)}
                        {" · "}
                        ❤️ {p._count.reactions} · 💬 {p._count.comments}
                      </div>
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {/* Challenges */}
            {results.challenges.length > 0 && (
              <Section title={`Challenge (${results.challenges.length})`}>
                {results.challenges.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/c/${ch.community.slug}/challenges/${ch.slug}`}
                    style={resultCardStyle}
                  >
                    <div style={{ fontSize: 20, flexShrink: 0 }}>🏆</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={cardTitleStyle}>{ch.title}</div>
                      <div style={cardMetaStyle}>
                        {ch.community.name} · {ch.difficulty} · {ch.status === "OPEN" ? "Đang mở" : "Đang diễn ra"}
                      </div>
                      {ch.description && (
                        <div style={cardMetaStyle}>
                          {ch.description.slice(0, 100)}
                          {ch.description.length > 100 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {/* Empty */}
            {results.posts.length === 0 &&
              results.users.length === 0 &&
              results.communities.length === 0 &&
              results.challenges.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-8) 0",
                    color: "var(--text-muted)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Không tìm thấy kết quả cho &ldquo;{query}&rdquo;
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "var(--space-6)" }}>
      <h2
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          margin: "0 0 var(--space-2) 0",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </section>
  );
}

const resultCardStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "10px 12px",
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  textDecoration: "none",
  color: "inherit",
  alignItems: "flex-start",
};

const iconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  objectFit: "cover",
  flexShrink: 0,
  display: "block",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  color: "var(--header-primary)",
  marginBottom: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const cardSubStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
};

const cardMetaStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};
