"use client";

import { useState } from "react";

/**
 * Copy post URL to clipboard. Shows "Đã copy" confirmation for 2 seconds.
 * Uses the platform origin from window.location at click time so it works
 * across prod and local.
 */
export function ShareButton({
  communitySlug,
  postId,
  variant = "inline",
  onDone,
}: {
  communitySlug: string;
  postId: string;
  variant?: "inline" | "menu";
  onDone?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const url = `${window.location.origin}/c/${communitySlug}/p/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (old browser / permission denied) → fallback prompt
      window.prompt("Copy link bài viết:", url);
    }
    onDone?.();
  }

  return (
    <button
      type="button"
      className={variant === "inline" ? "feed-post-action" : undefined}
      onClick={onClick}
      style={
        variant === "menu"
          ? menuButtonStyle(copied ? "var(--success)" : "var(--text-normal)")
          : {
              marginLeft: "auto",
              color: copied ? "var(--success)" : undefined,
              fontWeight: copied ? 600 : undefined,
            }
      }
      aria-label="Copy link bài viết"
    >
      {copied ? "✓ Đã copy" : "🔗 Share"}
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
