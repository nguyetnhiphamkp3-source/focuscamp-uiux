"use client";

import { useEffect, useRef, useState } from "react";

export function ProfileShareButton({
  profilePath,
  profileTitle,
}: {
  profilePath: string;
  profileTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copyUrl() {
    const url = new URL(profilePath, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(`Copy link profile ${profileTitle}:`, url);
    }
  }

  return (
    <button
      type="button"
      className="ui-btn ui-btn-secondary ui-btn-sm"
      onClick={copyUrl}
      aria-label={`Copy link profile ${profileTitle}`}
      style={{
        color: copied ? "var(--success)" : undefined,
      }}
    >
      {copied ? "Đã copy" : "Chia sẻ"}
    </button>
  );
}
