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
}: {
  communitySlug: string;
  postId: string;
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
  }

  return (
    <button
      type="button"
      className="feed-post-action"
      onClick={onClick}
      style={{
        marginLeft: "auto",
        color: copied ? "var(--success)" : undefined,
        fontWeight: copied ? 600 : undefined,
      }}
      aria-label="Copy link bài viết"
    >
      {copied ? "✓ Đã copy" : "🔗 Share"}
    </button>
  );
}
