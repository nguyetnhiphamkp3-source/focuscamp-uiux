"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookEventAction } from "@/app/actions/event";
import { fmtVnd } from "@/lib/brand";

export function EventRsvpButton({
  eventId,
  communitySlug,
  isFree,
  priceVnd,
  full,
  bookingStatus,
}: {
  eventId: string;
  communitySlug: string;
  isFree: boolean;
  priceVnd: number;
  full: boolean;
  bookingStatus?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isBooked = bookingStatus === "CONFIRMED" || bookingStatus === "ATTENDED";

  function handleRsvp() {
    if (isBooked || full || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await bookEventAction({ eventId, communitySlug });
      if (!res.ok) {
        if (res.reason === "unauthorized") {
          router.push("/login");
          return;
        }
        setError(res.reason);
        return;
      }
      if (res.status === "PENDING_PAYMENT") {
        router.push(`/pay/${res.paymentCode}?return=/c/${communitySlug}/events/${eventId}`);
        return;
      }
      router.push(`/c/${communitySlug}/events/${eventId}`);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        onClick={handleRsvp}
        disabled={isBooked || full || isPending}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: isBooked
            ? "var(--success-soft)"
            : full
              ? "var(--bg-modifier-hover)"
              : "var(--brand-green)",
          color: isBooked ? "var(--success)" : full ? "var(--text-muted)" : "#fff",
          fontWeight: isBooked ? 700 : 600,
          fontSize: "var(--text-sm)",
          cursor: isBooked || full || isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.7 : 1,
          transition: "opacity 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {isBooked
          ? "✓ Đã đăng ký"
          : isPending
            ? "Đang xử lý…"
            : full
              ? "Đã đủ chỗ"
              : isFree
                ? "Đăng ký"
                : `Đăng ký — ${fmtVnd(priceVnd)}đ`}
      </button>
      {error && (
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            maxWidth: 160,
            textAlign: "right",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
