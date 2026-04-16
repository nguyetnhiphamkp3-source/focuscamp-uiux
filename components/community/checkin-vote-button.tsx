"use client";

import { useState, useTransition } from "react";
import { toggleCheckinVoteAction } from "@/app/actions/challenge-review";

export function CheckinVoteButton({
  checkinId,
  communitySlug,
  challengeSlug,
  initialCount,
  initialVoted,
  disabled = false,
}: {
  checkinId: string;
  communitySlug: string;
  challengeSlug: string;
  initialCount: number;
  initialVoted: boolean;
  disabled?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [pending, start] = useTransition();

  function toggle() {
    if (disabled || pending) return;
    // Optimistic
    const prev = { count, voted };
    setVoted(!voted);
    setCount(voted ? count - 1 : count + 1);
    start(async () => {
      const res = await toggleCheckinVoteAction({
        checkinId,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        setVoted(res.data.voted);
        setCount(res.data.count);
      } else {
        setVoted(prev.voted);
        setCount(prev.count);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      aria-label={voted ? "Bỏ vote" : "Vote submission chất"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        background: voted ? "rgba(27,158,117,0.12)" : "transparent",
        border: `1px solid ${voted ? "var(--brand-green)" : "var(--border-subtle)"}`,
        borderRadius: 12,
        color: voted ? "var(--brand-green)" : "var(--interactive-normal)",
        fontSize: "var(--text-xs)",
        fontWeight: voted ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 120ms ease",
      }}
    >
      <span>{voted ? "👍" : "👍🏻"}</span>
      <span>{count}</span>
    </button>
  );
}
