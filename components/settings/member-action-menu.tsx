"use client";

import { useState, useRef, useEffect } from "react";

const ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "MOD", label: "Mod" },
  { value: "ADMIN", label: "Admin" },
];

/**
 * Kebab (⋯) menu on a member row in the settings/members list.
 * Contains: role selector (3 buttons, current marked ✓) + Xoá.
 * Replaces the inline <select> + Xoá button, which crowded the row on
 * mobile and pushed name + stats into truncation/wrapping.
 */
export function MemberActionMenu({
  currentRole,
  pending,
  onChangeRole,
  onRemove,
}: {
  currentRole: string;
  pending: boolean;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!btnRef.current?.parentElement?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={pending}
        aria-label="Tuỳ chọn thành viên"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          padding: "4px 10px",
          minWidth: 32,
          background: "transparent",
          border: "1px solid var(--border-subtle)",
          borderRadius: 6,
          color: "var(--text-muted)",
          cursor: pending ? "not-allowed" : "pointer",
          fontSize: "var(--text-md)",
          lineHeight: 1,
          fontFamily: "inherit",
        }}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: 4,
            minWidth: 168,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "6px 12px 4px",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Vai trò
          </div>
          {ROLES.map((r) => {
            const active = r.value === currentRole;
            return (
              <button
                key={r.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  if (!active) onChangeRole(r.value);
                }}
                disabled={pending}
                style={menuItemStyle(
                  active ? "var(--brand-green)" : "var(--text-normal)",
                  active,
                )}
              >
                {active ? "✓ " : " "}
                {r.label}
              </button>
            );
          })}
          <div style={menuDividerStyle} />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            disabled={pending}
            style={menuItemStyle("var(--danger)", false)}
          >
            🗑 Xoá
          </button>
        </div>
      )}
    </div>
  );
}

function menuItemStyle(color: string, active: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    color,
    fontFamily: "inherit",
    fontWeight: active ? 600 : 400,
  };
}

const menuDividerStyle: React.CSSProperties = {
  height: 1,
  background: "var(--border-subtle)",
  margin: "4px 0",
};
