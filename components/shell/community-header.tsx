"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Action bar sitting at the top of sidebar tính năng chính for a community.
 * Row 1: community name + dropdown (▼) + invite icon
 * Row 2: search bar (scopes to this community)
 */
export function CommunityHeader({
  slug,
  name,
  isOwner = false,
  isMember = false,
}: {
  slug: string;
  name: string;
  isOwner?: boolean;
  isMember?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        padding: "var(--space-3) var(--space-3) var(--space-2)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      {/* Row 1: Name + dropdown + invite */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "6px 10px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-md)",
            background: open ? "var(--bg-modifier-active)" : "var(--bg-card)",
            cursor: "pointer",
            color: "var(--text-heading)",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: "var(--text-base)",
              fontWeight: "var(--fw-bold)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{
              transition: "transform var(--dur-fast) var(--ease)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              color: "var(--text-muted)",
            }}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
        <Link
          href={`/c/${slug}/invite`}
          title="Mời bạn bè"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </Link>
      </div>

      {/* Row 2: Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-elevated)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ color: "var(--text-muted)", flexShrink: 0 }}
        >
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder={`Tìm trong ${name.split(" ").slice(0, 2).join(" ")}…`}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "var(--text-sm)",
            color: "var(--text-normal)",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% - 4px)",
            left: "var(--space-3)",
            right: "var(--space-3)",
            background: "var(--bg-floating)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-2)",
            zIndex: 50,
          }}
        >
          <MenuItem
            href={`/c/${slug}/invite`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            }
            label="Mời bạn bè"
            onClick={() => setOpen(false)}
          />
          <MenuItem
            href={`/c/${slug}/profile`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            }
            label="Hồ sơ của tôi"
            onClick={() => setOpen(false)}
          />
          <MenuItem
            href="#"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            }
            label="Thông báo"
            onClick={() => setOpen(false)}
          />
          <MenuDivider />
          {isOwner && (
            <MenuItem
              href={`/c/${slug}/settings`}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
              }
              label="Cài đặt cộng đồng"
              onClick={() => setOpen(false)}
            />
          )}
          {isMember && !isOwner && (
            <MenuItem
              href="#"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8l-1.41 1.41L18.17 12H10v2h8.17l-2.58 2.59L17 18l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
              }
              label="Rời cộng đồng"
              danger
              onClick={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
  danger = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--r-md)",
        color: danger ? "var(--danger)" : "var(--text-normal)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--fw-medium)",
        textDecoration: "none",
      }}
      className="cm-menu-item"
    >
      <span style={{ color: "var(--text-muted)", display: "flex" }}>{icon}</span>
      {label}
    </Link>
  );
}

function MenuDivider() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--border-subtle)",
        margin: "var(--space-1) 0",
      }}
    />
  );
}
