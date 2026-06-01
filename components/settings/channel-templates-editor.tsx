"use client";

import { useState } from "react";
import { inputStyle } from "./editor-shared";
import { EVENT_TYPES, type EventKey } from "./channel-shared";

export type Templates = Record<string, { title: string; description: string }>;

/**
 * Collapsible per-event message template overrides. Templates are shared
 * across all channels (global per event-type). Empty = use system default.
 */
export function ChannelTemplatesEditor({
  templates,
  disabled,
  onSet,
}: {
  templates: Templates;
  disabled?: boolean;
  onSet: (eventKey: string, field: "title" | "description", val: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState<EventKey | null>(null);

  return (
    <div
      style={{
        padding: 14,
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          width: "100%",
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--header-primary)" }}>
          ✏️ Tùy chỉnh nội dung thông báo
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 4 }}>
          (tuỳ chọn — để trống = dùng mặc định)
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 12 }}>
          {show ? "▲" : "▼"}
        </span>
      </button>

      {show && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {EVENT_TYPES.map((e) => {
            const isOpen = expanded === e.key;
            const tmpl = templates[e.key];
            const hasCustom = tmpl?.title.trim() || tmpl?.description.trim();
            return (
              <div
                key={e.key}
                style={{
                  border: `1px solid ${hasCustom ? "var(--brand-green)" : "var(--border-subtle)"}`,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : e.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--header-primary)" }}>
                    {e.label}
                  </span>
                  {hasCustom && (
                    <span style={{ fontSize: 10, color: "var(--brand-green)", marginLeft: 4 }}>
                      ● tuỳ chỉnh
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 11 }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", background: "var(--bg-secondary)", borderRadius: 6, padding: "6px 10px" }}>
                      <strong>Biến:</strong> {e.vars}
                      <br />
                      <strong>Mặc định:</strong> {e.defaults.title}
                    </div>
                    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Tiêu đề</span>
                      <input
                        type="text"
                        value={tmpl?.title ?? ""}
                        onChange={(ev) => onSet(e.key, "title", ev.target.value)}
                        disabled={disabled}
                        placeholder={e.defaults.title}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Nội dung</span>
                      <input
                        type="text"
                        value={tmpl?.description ?? ""}
                        onChange={(ev) => onSet(e.key, "description", ev.target.value)}
                        disabled={disabled}
                        placeholder={e.defaults.description}
                        style={inputStyle}
                      />
                    </label>
                    {(tmpl?.title.trim() || tmpl?.description.trim()) && (
                      <button
                        type="button"
                        onClick={() => { onSet(e.key, "title", ""); onSet(e.key, "description", ""); }}
                        style={{ fontSize: "var(--text-xs)", color: "var(--danger)", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}
                      >
                        ✕ Xoá tùy chỉnh (về mặc định)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
