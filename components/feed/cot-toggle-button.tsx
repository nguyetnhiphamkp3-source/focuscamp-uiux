"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleCotAction } from "@/app/actions/posts";
import { useRouter } from "next/navigation";

export function CotToggleButton({
  postId,
  communitySlug,
  initialIsCot,
  variant = "inline",
  onDone,
}: {
  postId: string;
  communitySlug: string;
  initialIsCot: boolean;
  variant?: "inline" | "menu";
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isCot, setIsCot] = useState(initialIsCot);
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await toggleCotAction({ postId, communitySlug });
      if (res.ok && res.data) {
        setIsCot(res.data.isCot);
        onDone?.();
        router.refresh();
      }
    });
  }

  const text =
    variant === "inline" && isCot ? "CỐT" : isCot ? "Bỏ CỐT" : "Mark CỐT";

  return (
    <button
      type="button"
      className={variant === "inline" ? "feed-post-action" : undefined}
      onClick={toggle}
      disabled={pending}
      title={isCot ? "Bỏ đánh dấu CỐT" : "Đánh dấu bài chất lượng cao (CỐT)"}
      style={
        variant === "menu"
          ? menuButtonStyle(isCot ? "var(--premium-gold)" : "var(--text-normal)")
          : {
              color: isCot ? "var(--premium-gold)" : undefined,
              fontWeight: isCot ? 700 : undefined,
            }
      }
    >
      <Star size={variant === "menu" ? 15 : 16} fill={isCot ? "currentColor" : "none"} /> {text}
    </button>
  );
}

function menuButtonStyle(color: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
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
