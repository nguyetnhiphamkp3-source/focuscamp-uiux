import Link from "next/link";
import { fmtRelativeTime } from "@/lib/brand";

export type BookmarkedPost = {
  id: string;
  type: string;
  title: string | null;
  body: string;
  isCot: boolean;
  createdAt: Date;
  commentCount: number;
  reactionCount: number;
  community: { slug: string; name: string };
  bookmarkedAt: Date;
};

export function ProfileBookmarks({
  bookmarks,
}: {
  bookmarks: BookmarkedPost[];
}) {
  return (
    <div className="pf-section" style={{ marginTop: 20 }}>
      <h3>🔖 Đã lưu</h3>
      {bookmarks.length === 0 ? (
        <div
          style={{
            padding: 14,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontStyle: "italic",
          }}
        >
          Bạn chưa lưu bài nào. Bấm 🔖 trên một bài viết bất kỳ (bảng tin, hỏi đáp, tín hiệu) để lưu lại đọc sau.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {bookmarks.map((p) => {
            const typeTag =
              p.type === "QUESTION"
                ? "❓"
                : p.type === "SIGNAL"
                  ? "⚡"
                  : "📝";
            return (
              <Link
                key={p.id}
                href={`/c/${p.community.slug}/p/${p.id}`}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 12,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 20, flexShrink: 0 }}>{typeTag}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--text-base)",
                      fontWeight: 600,
                      color: "var(--header-primary)",
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title ||
                      p.body.slice(0, 80) + (p.body.length > 80 ? "…" : "")}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        background: "var(--bg-elevated)",
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontWeight: 600,
                        color: "var(--brand-green)",
                      }}
                    >
                      {p.community.name}
                    </span>
                    <span>· lưu {fmtRelativeTime(p.bookmarkedAt)}</span>
                    {p.isCot && (
                      <span style={{ color: "var(--premium-gold)" }}>
                        · ⭐ CỐT
                      </span>
                    )}
                    <span>· ❤️ {p.reactionCount}</span>
                    <span>· 💬 {p.commentCount}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
