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
          Đã lưu → xem tại{" "}
          <strong>Bảng tin &gt; Bookmarked</strong>
        </span>
      )}
    </span>
  );
}
