"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  deletePostAction,
  updatePostAction,
} from "@/app/actions/posts";
import type { PillarConfig } from "@/lib/community-config";

/**
 * Three-dot menu on a post — shows when current user is author or community
 * owner. Actions:
 *   - Edit (author only)
 *   - Delete (author or owner)
 */
export function PostMenu({
  postId,
  communitySlug,
  canEdit,
  canDelete,
  redirectOnDelete = false,
  initial,
  pillars,
}: {
  postId: string;
  communitySlug: string;
  canEdit: boolean;
  canDelete: boolean;
  /** True on detail page — after delete, server action redirects to list */
  redirectOnDelete?: boolean;
  initial: { title: string | null; body: string; pillar: string | null };
  pillars: PillarConfig[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initial.title ?? "");
  const [body, setBody] = useState(initial.body);
  const [pillar, setPillar] = useState(initial.pillar ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!btnRef.current?.parentElement?.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  function onDelete() {
    if (!confirm("Xoá bài viết này? Toàn bộ comment + reaction cũng sẽ mất.")) return;
    setErr(null);
    start(async () => {
      const res = await deletePostAction({
        postId,
        communitySlug,
        redirectAfter: redirectOnDelete,
      });
      if (res.ok) router.refresh();
      else if (!res.ok) setErr(res.reason);
    });
  }

  function saveEdit() {
    setErr(null);
    start(async () => {
      const res = await updatePostAction({
        postId,
        communitySlug,
        title: title.trim() || undefined,
        body: body.trim(),
        pillar: pillar || undefined,
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  if (!canEdit && !canDelete) return null;

  return (
    <>
      <div style={{ position: "relative", marginLeft: "auto" }}>
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="feed-post-action"
          style={{ padding: "4px 10px", minWidth: 32 }}
          aria-label="Tuỳ chọn bài viết"
        >
          ⋯
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: 4,
              minWidth: 140,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              zIndex: 10,
            }}
          >
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditing(true);
                }}
                style={menuItemStyle("var(--text-normal)")}
              >
                ✎ Sửa
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                disabled={pending}
                style={menuItemStyle("var(--danger)")}
              >
                🗑 Xoá
              </button>
            )}
          </div>
        )}
      </div>

      {err && (
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            marginTop: 4,
          }}
        >
          {err}
        </div>
      )}

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setEditing(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--bg-main)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 640,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--header-primary)",
              }}
            >
              Sửa bài viết
            </div>
            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <input
                type="text"
                placeholder="Tiêu đề (tuỳ chọn)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                disabled={pending}
                style={inputDlg}
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                maxLength={10000}
                disabled={pending}
                style={{ ...inputDlg, resize: "vertical", fontFamily: "inherit" }}
              />
              {pillars.length > 0 && (
                <select
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value)}
                  disabled={pending}
                  style={{ ...inputDlg, maxWidth: 240 }}
                >
                  <option value="">— Không Pillar —</option>
                  {pillars.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.emoji ? `${p.emoji} ` : ""}
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {err && (
              <div
                style={{
                  padding: "0 20px 8px",
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                }}
              >
                {err}
              </div>
            )}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => !pending && setEditing(false)}
                disabled={pending}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--interactive-normal)",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={pending || !body.trim()}
                style={{
                  marginLeft: "auto",
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background: body.trim()
                    ? "var(--brand-green)"
                    : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: body.trim() ? "pointer" : "not-allowed",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function menuItemStyle(color: string): React.CSSProperties {
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
  };
}

const inputDlg: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
};
