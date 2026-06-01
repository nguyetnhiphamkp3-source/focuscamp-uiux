"use client";

import { useCallback, useEffect, useRef, useId } from "react";

export function ConfirmModal({
  open,
  title = "Xác nhận",
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus cancel for danger actions, confirm for safe actions
    if (danger) cancelRef.current?.focus();
    else confirmRef.current?.focus();

    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, danger]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        // Stop bubbling so a parent modal (e.g. order detail) doesn't also close.
        e.stopPropagation();
        onCancel();
        return;
      }
      // Focus trap between cancel and confirm buttons
      if (e.key === "Tab") {
        e.stopPropagation();
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg-floating)",
          borderRadius: 14,
          border: "1px solid var(--border-subtle)",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          id={titleId}
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 700,
            color: "var(--header-primary)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "var(--text-base)",
            color: "var(--text-normal)",
            lineHeight: 1.5,
            whiteSpace: "pre-line",
          }}
        >
          {message}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--interactive-normal)",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              fontWeight: 500,
              minHeight: 40,
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: danger ? "var(--danger, #e53e3e)" : "var(--brand-green)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              minHeight: 40,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
