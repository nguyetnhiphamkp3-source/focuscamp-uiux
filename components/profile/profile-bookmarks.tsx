"use client";

import { useState } from "react";
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

const PAGE_SIZE = 8;

export function ProfileBookmarks({
  bookmarks,
}: {
  bookmarks: BookmarkedPost[];
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(bookmarks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = bookmarks.slice(start, start + PAGE_SIZE);

  return (
    <div className="pf-section" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ flex: 1, margin: 0 }}>🔖 Đã lưu</h3>
        {bookmarks.length > 0 && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {bookmarks.length}/24
          </span>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div
          style={{
            padding: 14,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontStyle: "italic",
            marginTop: 8,
          }}
        >
          Bạn chưa lưu bài nào. Bấm 🔖 trên một bài viết bất kỳ (bảng tin, hỏi đáp, tín hiệu) để lưu lại đọc sau. Tối đa 24 bài — bài cũ nhất sẽ tự bỏ khi bạn lưu bài mới quá hạn mức.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {visible.map((p) => {
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
