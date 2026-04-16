"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkinAction } from "@/app/actions/checkin";

export function CheckinForm({
  challengeId,
  communitySlug,
  challengeSlug,
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const len = content.length;
  const canSubmit = len >= 5 && len <= 1000 && !pending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await checkinAction({
        challengeId,
        content,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        if (res.redirectTo) {
          router.push(res.redirectTo);
          return;
        }
        setDone(true);
        setContent("");
      } else {
        setError(res.reason || "unknown_error");
      }
    });
  }

  if (done) {
    return (
      <div
        className="ui-card"
        style={{
          textAlign: "center",
          background: "var(--success-soft)",
          border: "1px solid var(--success)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: "var(--space-2)" }}>🔥</div>
        <div
          style={{
            fontWeight: "var(--fw-bold)",
            color: "var(--brand-green-dark)",
            marginBottom: "var(--space-1)",
          }}
        >
          Check-in thành công · +5 XP
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Streak tiếp tục. Hẹn gặp lại ngày mai!
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div
        className="ui-card"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      >
        <div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontWeight: "var(--fw-semibold)",
              marginBottom: "var(--space-2)",
            }}
          >
            Check-in hôm nay
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hôm nay bạn đã làm gì để tiến lên? (5-1000 chars)"
            rows={4}
            style={{
              width: "100%",
              padding: "var(--space-3)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-elevated)",
              fontSize: "var(--text-base)",
              color: "var(--text-normal)",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 80,
              outline: "none",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: len < 5 || len > 1000 ? "var(--danger)" : "var(--text-muted)",
            }}
          >
            {len} / 1000
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="ui-btn ui-btn-primary ui-btn-sm"
          >
            {pending ? "Đang gửi…" : "Check-in (+5 XP)"}
          </button>
        </div>
        {error && (
          <div
            style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--r-md)",
              background: "var(--danger-soft)",
              color: "var(--danger)",
              fontSize: "var(--text-sm)",
            }}
          >
            ❌{" "}
            {error === "already_checked_in_today"
              ? "Bạn đã check-in hôm nay rồi."
              : error === "not_a_member"
                ? "Bạn chưa tham gia challenge này."
                : `Lỗi: ${error}`}
          </div>
        )}
      </div>
    </form>
  );
}
