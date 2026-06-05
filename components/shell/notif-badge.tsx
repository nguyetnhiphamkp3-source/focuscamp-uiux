"use client";

import { useEffect, useState } from "react";

/**
 * Client-side bell badge with SSE real-time push + polling fallback.
 *
 * Priority: SSE stream → if connection fails, falls back to 30s polling.
 * Starts from the server-rendered `initial` count for zero-flash first paint.
 * Stops when tab is hidden — resumes on focus.
 */
export function NotifBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let stopped = false;
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Fetch current count from REST endpoint
    async function refreshCount() {
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

    // Try SSE connection
    function connectSSE() {
      if (stopped) return;
      try {
        eventSource = new EventSource("/api/notifications/stream");
        eventSource.addEventListener("notification", (e) => {
          // Increment optimistically, then refresh for accurate count
          setCount((c) => c + 1);
          refreshCount();
          // Re-broadcast on the window so feature components (e.g. the challenge
          // live-refresh) can react off this single shared connection instead of
          // opening their own SSE stream.
          try {
            const detail = JSON.parse((e as MessageEvent).data);
            window.dispatchEvent(new CustomEvent("fc:notification", { detail }));
          } catch {
            /* ignore malformed payloads */
          }
        });
        eventSource.onerror = () => {
          // SSE failed — close and fall back to polling
          eventSource?.close();
          eventSource = null;
          startPolling();
        };
      } catch {
        startPolling();
      }
    }

    // Fallback: poll every 30s
    function startPolling() {
      if (stopped || pollInterval) return;
      pollInterval = setInterval(() => {
        if (document.visibilityState === "visible") refreshCount();
      }, 30_000);
    }

    // Visibility handler — reconnect SSE or refresh on tab focus
    function onVisibility() {
      if (document.visibilityState === "visible") {
        refreshCount();
        if (!eventSource) connectSSE();
      } else {
        // Close SSE when hidden to save resources
        eventSource?.close();
        eventSource = null;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    // Start
    connectSSE();

    return () => {
      stopped = true;
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (count <= 0) return null;
  return <span className="unread-badge">{count > 99 ? "99+" : count}</span>;
}
