"use client";

/**
 * Shared UI primitives for the concept editors (pillars / classes / levels).
 * Keeping them here avoids re-styling the same row/input/button in every editor.
 */

import { CSSProperties } from "react";

export const inputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
};

export const btnPrimary: CSSProperties = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "none",
  background: "var(--brand-green)",
  color: "#fff",
  fontWeight: 600,
  fontSize: "var(--text-sm)",
  cursor: "pointer",
};

export const btnSecondary: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "transparent",
  color: "var(--interactive-normal)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
};

export const btnDanger: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid var(--danger)",
  background: "transparent",
  color: "var(--danger)",
  cursor: "pointer",
  fontSize: "var(--text-xs)",
};

export const rowCard: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  padding: 12,
  marginBottom: 8,
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

export function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div
      style={{
        fontSize: "var(--text-sm)",
        color: "var(--danger)",
        padding: "6px 10px",
        background: "rgba(218,55,60,0.08)",
        borderRadius: 6,
        marginTop: 8,
      }}
    >
      {msg}
    </div>
  );
}

export function SuccessBox({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <div
      style={{
        fontSize: "var(--text-sm)",
        color: "var(--success)",
        padding: "6px 10px",
        background: "rgba(36,128,70,0.08)",
        borderRadius: 6,
        marginTop: 8,
      }}
    >
      ✓ Đã lưu
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--header-primary)",
          margin: 0,
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <div
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

/** Toolbar row at the bottom of each editor — Add + Save buttons. */
export function EditorToolbar({
  canSave,
  pending,
  onAdd,
  onSubmit,
  addLabel = "+ Thêm",
}: {
  canSave: boolean;
  pending: boolean;
  onAdd: () => void;
  onSubmit: () => void;
  addLabel?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
      <button type="button" onClick={onAdd} style={btnSecondary}>
        {addLabel}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSave || pending}
        style={{
          ...btnPrimary,
          marginLeft: "auto",
          opacity: !canSave || pending ? 0.6 : 1,
          cursor: !canSave || pending ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "Đang lưu…" : "Lưu"}
      </button>
    </div>
  );
}
