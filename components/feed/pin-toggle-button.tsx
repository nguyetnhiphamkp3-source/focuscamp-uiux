"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePinAction } from "@/app/actions/posts";

export function PinToggleButton({
  postId,
  communitySlug,
  initialIsPinned,
  variant = "inline",
  onDone,
}: {
  postId: string;
  communitySlug: string;
  initialIsPinned: boolean;
  variant?: "inline" | "menu";
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await togglePinAction({ postId, communitySlug });
      if (res.ok && res.data) {
        setIsPinned(res.data.isPinned);
        onDone?.();
        router.refresh();
      }
    });
  }

  const label = isPinned ? "📌 Bỏ ghim" : "📌 Ghim";

  return (
    <button
      type="button"
      className={variant === "inline" ? "feed-post-action" : undefined}
      onClick={toggle}
      disabled={pending}
      title={isPinned ? "Bỏ ghim bài" : "Ghim bài lên đầu feed"}
      style={
        variant === "menu"
          ? menuButtonStyle(isPinned ? "var(--brand-green)" : "var(--text-normal)")
          : {
              color: isPinned ? "var(--brand-green)" : undefined,
              fontWeight: isPinned ? 700 : undefined,
            }
      }
    >
      {variant === "inline" && isPinned ? "📌 Đã ghim" : label}
    </button>
  );
}

function menuButtonStyle(color: string): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    color,
    fontFamily: "inherit",
    fontWeight: 600,
  };
}
