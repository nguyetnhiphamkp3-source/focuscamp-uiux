"use client";

import { useState } from "react";
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

const PAGE_SIZE = 7;

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
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(recentPosts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = recentPosts.slice(start, start + PAGE_SIZE);

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
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((p) => {
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

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: "var(--text-sm)",
                  border: "1px solid var(--border-subtle)",
                  background: safePage === 0 ? "transparent" : "var(--bg-elevated)",
                  color: safePage === 0 ? "var(--text-muted)" : "var(--interactive-normal)",
                  cursor: safePage === 0 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                ← Trước
              </button>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {safePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: "var(--text-sm)",
                  border: "1px solid var(--border-subtle)",
                  background:
                    safePage >= totalPages - 1 ? "transparent" : "var(--bg-elevated)",
                  color:
                    safePage >= totalPages - 1
                      ? "var(--text-muted)"
                      : "var(--interactive-normal)",
                  cursor: safePage >= totalPages - 1 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
