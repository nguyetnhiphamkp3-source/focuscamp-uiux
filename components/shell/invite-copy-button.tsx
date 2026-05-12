"use client";

import { useState } from "react";

export function InviteCopyButton({ communitySlug }: { communitySlug: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/c/${communitySlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      className="rs-join-btn secondary"
      style={{ margin: "4px 0" }}
      onClick={handleCopy}
    >
      {copied ? "✓ Đã sao chép link!" : "🔗 Invite People"}
    </button>
  );
}
