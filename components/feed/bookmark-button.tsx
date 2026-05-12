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

  function toggle() {
    const prev = bookmarked;
    setBookmarked(!bookmarked); // optimistic
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
  );
}
