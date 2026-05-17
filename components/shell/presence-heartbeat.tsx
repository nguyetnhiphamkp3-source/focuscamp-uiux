"use client";

import { useEffect } from "react";

const INTERVAL_MS = 60_000;

export function PresenceHeartbeat({ communityId }: { communityId: string }) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function sendHeartbeat() {
      fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      }).catch(() => {});
    }

    function start() {
      sendHeartbeat();
      timer = setInterval(sendHeartbeat, INTERVAL_MS);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [communityId]);

  return null;
}
