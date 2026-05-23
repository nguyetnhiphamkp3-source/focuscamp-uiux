"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBookmarkAction } from "@/app/actions/social";

export function BookmarkButton({
  postId,
  communitySlug,
  initialBookmarked,
}: {
  postId: string;
  communitySlug: string;
  initialBookmarked: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, start] = useTransition();
  const [showHint, setShowHint] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  function toggle() {
    const prev = bookmarked;
    const next = !bookmarked;
    setBookmarked(next);
    if (next) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
    }
    start(async () => {
      const res = await toggleBookmarkAction({ postId, communitySlug });
      if (res.ok && res.data) {
        setBookmarked(res.data.bookmarked);
        router.refresh();
      } else {
        setBookmarked(prev);
        setShowHint(false);
        if (!res.ok && res.reason === "bookmark_limit_reached") {
          setLimitReached(true);
        }
      }
    });
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        className="feed-post-action"
        onClick={toggle}
        disabled={pending}
        title={bookmarked ? "Bỏ bookmark" : "Bookmark để đọc sau"}
        style={{
          color: bookmarked ? "var(--brand-green)" : undefined,
          fontWeight: bookmarked ? 600 : undefined,
        }}
      >
        {bookmarked ? "🔖 Đã lưu" : "🔖 Bookmark"}
      </button>
      {showHint && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-floating)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: "var(--text-xs)",
            color: "var(--text-normal)",
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          Đã lưu → xem tại <strong>Trang cá nhân</strong>
        </span>
      )}

      {limitReached && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLimitReached(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 420,
              width: "100%",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--header-primary)",
              }}
            >
              🔖 Bookmark đã đầy (24/24)
            </div>
            <div
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-normal)",
                lineHeight: 1.5,
              }}
            >
              Bạn đã lưu tối đa 24 bài. Hãy vào{" "}
              <strong>Trang cá nhân</strong> và bỏ bookmark vài bài cũ
              trước khi lưu bài mới.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setLimitReached(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--interactive-normal)",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                  fontWeight: 500,
                }}
              >
                Để sau
              </button>
              <a
                href={`/c/${communitySlug}/profile`}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  background: "var(--brand-green)",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                }}
              >
                Xem bookmarks
              </a>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
