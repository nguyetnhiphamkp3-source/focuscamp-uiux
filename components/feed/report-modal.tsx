"use client";

import { useState, useTransition } from "react";
import { reportContentAction } from "@/app/actions/content-report";

const REASONS = [
  { value: "SPAM", label: "Spam / Quảng cáo" },
  { value: "HARASSMENT", label: "Quấy rối / Bạo lực" },
  { value: "SENSITIVE", label: "Nội dung nhạy cảm" },
  { value: "RULE_VIOLATION", label: "Vi phạm nội quy" },
  { value: "OTHER", label: "Lý do khác" },
] as const;

export function ReportModal({
  open,
  targetType,
  postId,
  commentId,
  communitySlug,
  onClose,
}: {
  open: boolean;
  targetType: "POST" | "COMMENT";
  postId?: string;
  commentId?: string;
  communitySlug: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  function handleSubmit() {
    if (!reason) return;
    setError(null);
    start(async () => {
      const res = await reportContentAction({
        communitySlug,
        targetType,
        postId,
        commentId,
        reason,
        detail: reason === "OTHER" ? detail : undefined,
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { onClose(); setSuccess(false); setReason(""); setDetail(""); }, 1500);
      } else {
        setError(res.reason);
      }
    });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div
        style={{
          position: "relative",
          background: "var(--bg-floating)",
          borderRadius: 8,
          padding: "var(--space-5)",
          width: 400,
          maxWidth: "90vw",
        }}
      >
        <h3 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", color: "var(--header-primary)" }}>
          Báo cáo nội dung
        </h3>

        {success ? (
          <p style={{ color: "var(--success)", fontSize: "var(--text-sm)" }}>Đã gửi báo cáo. Cảm ơn bạn!</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "var(--space-4)" }}>
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    background: reason === r.value ? "var(--bg-modifier-selected)" : "transparent",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-normal)",
                  }}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>

            {reason === "OTHER" && (
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Mô tả chi tiết..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--input-background)",
                  border: "1px solid var(--input-border)",
                  borderRadius: 4,
                  color: "var(--text-normal)",
                  fontSize: "var(--text-sm)",
                  resize: "vertical",
                  marginBottom: "var(--space-3)",
                }}
              />
            )}

            {error && (
              <p style={{ color: "var(--danger)", fontSize: "var(--text-xs)", marginBottom: 8 }}>{error}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: "var(--bg-modifier-hover)",
                  color: "var(--text-normal)",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!reason || pending}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: "var(--danger)",
                  color: "#fff",
                  cursor: !reason || pending ? "not-allowed" : "pointer",
                  opacity: !reason || pending ? 0.6 : 1,
                  fontSize: "var(--text-sm)",
                }}
              >
                {pending ? "Đang gửi…" : "Gửi báo cáo"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
