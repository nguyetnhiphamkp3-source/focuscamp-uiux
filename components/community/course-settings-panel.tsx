"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCourseAction } from "@/app/actions/course";

/**
 * Inline settings panel for course detail — owner can edit title,
 * description, level, isPublished toggle. Collapsed by default.
 */
export function CourseSettingsPanel({
  courseId,
  communitySlug,
  courseSlug,
  initial,
}: {
  courseId: string;
  communitySlug: string;
  courseSlug: string;
  initial: {
    title: string;
    description: string | null;
    level: string;
    isPublished: boolean;
    pillar: string | null;
    thumbnailUrl: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [level, setLevel] = useState(initial.level);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [thumbnailUrl, setThumbnailUrl] = useState(initial.thumbnailUrl ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateCourseAction({
        courseId,
        communitySlug,
        courseSlug,
        title: title.trim(),
        description: description.trim(),
        level: level as "BASIC" | "ADVANCED" | "EXPERT",
        isPublished,
        thumbnailUrl: thumbnailUrl.trim(),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <section
      style={{
        marginBottom: "var(--space-4)",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          padding: "10px 14px",
          cursor: "pointer",
          color: "var(--header-primary)",
          fontSize: "var(--text-sm)",
          fontWeight: 700,
          textAlign: "left",
        }}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>⚙️ Cài đặt khoá học (admin)</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "var(--text-xs)",
            color: isPublished ? "var(--success)" : "var(--warning)",
            fontWeight: 500,
          }}
        >
          {isPublished ? "Published" : "Draft"}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "0 14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Tên khoá học
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              disabled={pending}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Mô tả
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              disabled={pending}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Độ khó
              </span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={pending}
                style={inputStyle}
              >
                <option value="BASIC">🟢 Basic</option>
                <option value="ADVANCED">🟠 Advanced</option>
                <option value="EXPERT">🔴 Expert</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Thumbnail URL
              </span>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                disabled={pending}
                placeholder="https://..."
                style={inputStyle}
              />
            </label>
          </div>
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              disabled={pending}
            />
            <span style={{ fontSize: "var(--text-sm)" }}>
              <strong>Publish</strong> (hiển thị cho members)
            </span>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={save}
              disabled={pending || !title.trim()}
              style={{
                marginLeft: "auto",
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--brand-green)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
          {err && (
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
                padding: "6px 10px",
                background: "rgba(218,55,60,0.08)",
                borderRadius: 6,
              }}
            >
              {err}
            </div>
          )}
          {saved && (
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--success)",
                padding: "6px 10px",
                background: "rgba(36,128,70,0.08)",
                borderRadius: 6,
              }}
            >
              ✓ Đã lưu
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
};
