"use client";

import { useState, useTransition } from "react";
import { toggleReactionAction } from "@/app/actions/posts";

export function ReactionButton({
  postId,
  communitySlug,
  initialCount,
  initialReacted,
}: {
  postId: string;
  communitySlug: string;
  initialCount: number;
  initialReacted: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);
  const [pending, start] = useTransition();

  function toggle() {
    // Optimistic update
    const prevCount = count;
    const prevReacted = reacted;
    setReacted(!reacted);
    setCount(reacted ? count - 1 : count + 1);

    start(async () => {
      const res = await toggleReactionAction({ postId, communitySlug });
      if (res.ok && res.data) {
        setReacted(res.data.reacted);
        setCount(res.data.count);
      } else {
        // Revert on failure
        setReacted(prevReacted);
        setCount(prevCount);
      }
    });
  }

  return (
    <button
      type="button"
      className="feed-post-action"
      onClick={toggle}
      disabled={pending}
      style={{
        color: reacted ? "var(--danger)" : undefined,
        fontWeight: reacted ? 600 : undefined,
      }}
      aria-label={reacted ? "Bỏ thích" : "Thích"}
    >
      {reacted ? "❤️" : "🤍"} {count}
    </button>
  );
}
