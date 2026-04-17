"use client";

import { useEffect, useState } from "react";

/**
 * Keyboard shortcut cheat-sheet modal. Opens on "?" key.
 * Lists all registered shortcuts so users can discover them.
 */
export function ShortcutSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }
    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      // Shift+/ produces '?' on most layouts
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  const SHORTCUTS: { keys: string[]; label: string }[] = [
    { keys: ["⌘", "K"], label: "Mở tìm kiếm" },
    { keys: ["g", "h"], label: "Về Điểm tập kết (home)" },
    { keys: ["g", "i"], label: "Mở Inbox thông báo" },
    { keys: ["g", "d"], label: "Mở Discovery" },
    { keys: ["?"], label: "Hiện / ẩn cheatsheet này" },
    { keys: ["Esc"], label: "Đóng modal" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1100,
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
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--header-primary)",
            }}
          >
            Phím tắt
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 20,
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            padding: "12px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "6px 0",
              }}
            >
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    style={{
                      padding: "3px 8px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      borderRadius: 4,
                      fontFamily: "monospace",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-normal)",
                      fontWeight: 600,
                      minWidth: 22,
                      textAlign: "center",
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
              <span
                style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: "10px 20px 14px",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border-subtle)",
            marginTop: 8,
          }}
        >
          Phím tắt không hoạt động khi bạn đang gõ text trong input / textarea.
        </div>
      </div>
    </div>
  );
}
