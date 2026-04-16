"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/app/actions/social";

export function FollowButton({
  targetUserId,
  initialFollowing,
  variant = "default",
}: {
  targetUserId: string;
  initialFollowing: boolean;
  variant?: "default" | "compact";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();

  function toggle() {
    const prev = following;
    setFollowing(!following); // optimistic
    start(async () => {
      const res = await toggleFollowAction({ followeeId: targetUserId });
      if (res.ok && res.data) {
        setFollowing(res.data.following);
      } else {
        setFollowing(prev);
      }
    });
  }

  const baseStyle: React.CSSProperties = {
    padding: variant === "compact" ? "4px 10px" : "8px 16px",
    borderRadius: 999,
    fontSize: variant === "compact" ? "var(--text-xs)" : "var(--text-sm)",
    fontWeight: 600,
    cursor: pending ? "not-allowed" : "pointer",
    opacity: pending ? 0.6 : 1,
    transition: "all 120ms ease",
  };

  if (following) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        style={{
          ...baseStyle,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
          color: "var(--text-normal)",
        }}
      >
        ✓ Đang follow
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      style={{
        ...baseStyle,
        border: "none",
        background: "var(--brand-green)",
        color: "#fff",
      }}
    >
      + Follow
    </button>
  );
}
