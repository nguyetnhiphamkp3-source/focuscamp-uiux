"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

function formatRemaining(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

export function AutoStartCountdown({
  deadlineIso,
  deadlineLabel,
  serverNowIso,
}: {
  deadlineIso: string;
  deadlineLabel: string;
  serverNowIso: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const deadlineMsValue = useMemo(
    () => new Date(deadlineIso).getTime(),
    [deadlineIso]
  );
  const serverNowMsValue = useMemo(
    () => new Date(serverNowIso).getTime(),
    [serverNowIso]
  );
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const didRefresh = useRef(false);

  useEffect(() => {
    const mountedAtMs = window.performance.now();

    function tick() {
      const serverClockNowMs =
        serverNowMsValue + (window.performance.now() - mountedAtMs);
      const nextMsLeft = Math.max(0, deadlineMsValue - serverClockNowMs);
      setMsLeft(nextMsLeft);

      if (nextMsLeft <= 0 && !didRefresh.current) {
        didRefresh.current = true;
        startTransition(() => router.refresh());
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMsValue, router, serverNowMsValue, startTransition]);

  return (
    <div
      role="timer"
      style={{
        marginTop: "var(--space-1)",
        fontSize: "var(--text-xs)",
        color: "var(--warning)",
      }}
    >
      <div>
        Tự động bắt đầu sau{" "}
        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
          {msLeft == null ? "--:--:--" : formatRemaining(msLeft)}
        </strong>
        .
      </div>
      <div>
        Nếu không bấm, challenge sẽ tự bắt đầu lúc <strong>{deadlineLabel}</strong>.
      </div>
    </div>
  );
}
