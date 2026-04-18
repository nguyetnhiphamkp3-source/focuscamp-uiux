import Link from "next/link";
import { fmtRelativeTime } from "@/lib/brand";
import { pillarByKey } from "@/lib/community-config";
import type { PillarConfig } from "@/lib/community-config";

type RecentPost = {
  id: string;
  type: string;
  title: string | null;
  body: string;
  pillar: string | null;
  isCot: boolean;
  createdAt: Date;
  commentCount: number;
  reactionCount: number;
};

export function ProfileRecentPosts({
  recentPosts,
  communitySlug,
  pillars,
  isSelf,
}: {
  recentPosts: RecentPost[];
  communitySlug: string;
  pillars: PillarConfig[];
  isSelf: boolean;
}) {
  return (
    <div className="pf-section" style={{ marginTop: 20 }}>
      <h3>Bài viết gần đây</h3>
      {recentPosts.length === 0 ? (
        <div
          style={{
            padding: 14,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontStyle: "italic",
          }}
        >
          {isSelf
            ? "Bạn chưa đăng bài nào trong cộng đồng này."
            : "Chưa có bài viết."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentPosts.map((p) => {
            const pillar = pillarByKey(p.pillar, pillars);
            const typeTag =
              p.type === "QUESTION"
                ? "❓"
                : p.type === "SIGNAL"
                  ? "⚡"
                  : "📝";
            return (
              <Link
                key={p.id}
                href={`/c/${communitySlug}/p/${p.id}`}
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
                      marginBottom: 2,
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
                    }}
                  >
                    <span>{fmtRelativeTime(p.createdAt)}</span>
                    {pillar && (
                      <span>
                        · {pillar.emoji ? `${pillar.emoji} ` : ""}
                        {pillar.label}
                      </span>
                    )}
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
