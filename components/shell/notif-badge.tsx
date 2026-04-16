"use client";

import { useEffect, useState } from "react";

/**
 * Client-side bell badge that polls /api/notifications/unread-count every
 * 30s so users see new notifications without page refresh.
 *
 * Starts from the server-rendered `initial` count for zero-flash first paint.
 * Stops polling when tab is hidden (document.visibilityState) — resumes on
 * focus.
 */
export function NotifBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let stopped = false;

    async function refresh() {
      try {
        const r = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });
        if (!r.ok) return;
        const j = (await r.json()) as { unread?: number };
        if (!stopped && typeof j.unread === "number") setCount(j.unread);
      } catch {
        /* network errors are fine — keep previous count */
      }
    }

    // Poll every 30s but only when tab visible
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);

    // Immediate refresh when tab regains visibility
    function onVisibility() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (count <= 0) return null;
  return <span className="unread-badge">{count > 99 ? "99+" : count}</span>;
}
