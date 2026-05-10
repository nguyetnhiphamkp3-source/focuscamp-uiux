"use client";

import { useState, useTransition } from "react";
import { updateEventMeetingUrlAction } from "@/app/actions/event";

export function EventMeetingUrlEditor({
  eventId,
  communitySlug,
  currentUrl,
}: {
  eventId: string;
  communitySlug: string;
  currentUrl: string | null;
}) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateEventMeetingUrlAction({ eventId, communitySlug, meetingUrl: url });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.reason);
      }
    });
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
        🔗 Meeting URL (Zoom / Google Meet)
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          disabled={isPending}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-chat)",
            color: "var(--text-normal)",
            fontSize: "var(--text-sm)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--brand-green)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {isPending ? "Đang lưu…" : "Lưu link"}
        </button>
      </div>
      {saved && (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>✓ Đã lưu</span>
      )}
      {error && (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span>
      )}
    </div>
  );
}
