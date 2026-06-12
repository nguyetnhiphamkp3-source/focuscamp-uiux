"use client";

import {
  MoreHorizontal, ImageIcon, MessageSquare, LogOut, Settings,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { logoutAction } from "@/app/actions/auth";
import { avatarColorFor, initials } from "@/lib/brand";

/* ─── Wallpaper helpers ─────────────────────────────────────────────── */
const WP_KEY = "fc-wallpaper";
function applyWallpaper(url: string | null) {
  if (url) document.documentElement.style.setProperty("--app-wallpaper", `url("${url}")`);
  else document.documentElement.style.removeProperty("--app-wallpaper");
}

function downscale(file: File, maxW = 2560): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── MenuItem ──────────────────────────────────────────────────────── */
function MenuItem({
  icon, label, onClick, href, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const style: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "9px 14px", gap: 10, cursor: "pointer",
    fontSize: "var(--text-sm)", fontWeight: 500,
    color: danger ? "var(--danger)" : "var(--text-normal)",
    background: "transparent", border: "none", width: "100%",
    textAlign: "left", textDecoration: "none", transition: "background 100ms",
    borderRadius: 0,
  };
  const inner = (
    <>
      <span>{label}</span>
      <span style={{ color: danger ? "var(--danger)" : "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} style={style}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-modifier-hover)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >{inner}</Link>
    );
  }
  return (
    <button type="button" style={style} onClick={onClick}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-modifier-hover)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
    >{inner}</button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />;
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function UserMenu({
  user,
  chatHref,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  chatHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);
  const [, startTransition] = useTransition();

  const displayName = user.name || user.email || "Guest";

  /* Restore wallpaper + theme on mount */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WP_KEY);
      if (saved) applyWallpaper(saved);
    } catch { /* ignore */ }
  }, []);

  /* Position popup above button */
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      bottom: window.innerHeight - rect.top + 8,
      left: Math.max(8, rect.left - 260 + rect.width),
    });
  }, [open]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleWallpaperPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await downscale(file);
      localStorage.setItem(WP_KEY, url);
      applyWallpaper(url);
    } catch { /* ignore */ }
    setOpen(false);
  }

  function handleLogout() {
    startTransition(() => { logoutAction(); });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Tùy chọn"
        className="up-action"
        onClick={() => setOpen(v => !v)}
      >
        <MoreHorizontal size={20} />
      </button>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleWallpaperPick} />

      {open && pos && createPortal(
        <div
          ref={popupRef}
          style={{
            position: "fixed",
            bottom: pos.bottom,
            left: pos.left,
            width: 280,
            background: "var(--bg-card)",
            borderRadius: "var(--r-xl)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            zIndex: 9999,
            overflow: "hidden",
            paddingBottom: 8,
          }}
        >
          {/* User info header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 14px 12px",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: user.image ? "transparent" : avatarColorFor(user.email ?? "u"),
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, overflow: "hidden",
            }}>
              {user.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.image} alt="" style={{ width: 36, height: 36, objectFit: "cover" }} referrerPolicy="no-referrer" />
                : initials(displayName)
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: "var(--text-sm)", fontWeight: 700,
                color: "var(--header-primary)", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {displayName}
              </div>
              {user.email && (
                <div style={{
                  fontSize: "var(--text-xs)", color: "var(--text-muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user.email}
                </div>
              )}
            </div>
            <Link
              href="/settings"
              title="Cài đặt"
              onClick={() => setOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", background: "var(--bg-elevated)",
                flexShrink: 0,
              }}
            >
              <Settings size={15} />
            </Link>
          </div>

          <Divider />

          {/* Actions */}
          <MenuItem
            icon={<ImageIcon size={15} />}
            label="Đổi hình nền"
            onClick={() => { fileInputRef.current?.click(); }}
          />
          {chatHref && (
            <MenuItem
              icon={<MessageSquare size={15} />}
              label="Tin nhắn"
              href={chatHref}
              onClick={() => setOpen(false)}
            />
          )}

          <Divider />

          <MenuItem
            icon={<LogOut size={15} />}
            label="Đăng xuất"
            onClick={handleLogout}
            danger
          />
        </div>,
        document.body
      )}
    </>
  );
}
