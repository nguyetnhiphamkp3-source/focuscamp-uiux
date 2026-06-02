"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentStatusPoller({ paymentCode }: { paymentCode: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("PENDING");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/payments/${paymentCode}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        if (cancelled) return;
        if (data.status && data.status !== status) {
          setStatus(data.status);
          if (data.status === "COMPLETED" || data.status === "EXPIRED" || data.status === "CANCELLED") {
            router.refresh();
          }
        }
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(tick, 3000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [paymentCode, router, status]);

  return (
    <div
      className="mt-4 text-xs text-center"
      style={{ color: "var(--text-muted)" }}
    >
      {status === "PENDING" ? "⏳ Đang chờ chuyển khoản…" : null}
    </div>
  );
}
