"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateCourseAction } from "@/app/actions/course";
import { ImageUploadField } from "@/components/shared/image-upload-field";

/**
 * Modal settings panel for course detail — owner can edit title,
 * description, level, isPublished toggle. Opens via custom event.
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

  useEffect(() => {
    function handleOpen() { setOpen(true); }
    window.addEventListener("open-course-settings", handleOpen);
    return () => window.removeEventListener("open-course-settings", handleOpen);
  }, []);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [level, setLevel] = useState(initial.level);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [thumbnailUrl, setThumbnailUrl] = useState(initial.thumbnailUrl ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [saving, setSaving] = useState(false);

  async function save() {
    setErr(null);
    setSaved(false);
    setSaving(true);
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
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setErr(res.reason);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <section
        style={{
          width: "min(600px, 90vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--header-primary)" }}>
            ⚙️ Cài đặt khoá học
          </span>
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
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--text-muted)",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
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
              disabled={saving}
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
              disabled={saving}
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
                disabled={saving}
                style={inputStyle}
              >
                <option value="BASIC">🟢 Basic</option>
                <option value="ADVANCED">🟠 Advanced</option>
                <option value="EXPERT">🔴 Expert</option>
              </select>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Thumbnail
              </span>
              <ImageUploadField
                value={thumbnailUrl || null}
                onChange={(url) => setThumbnailUrl(url ?? "")}
                context="community"
                shape="banner"
                disabled={saving}
                placeholder="Ảnh bìa khoá học"
              />
            </div>
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
              disabled={saving}
            />
            <span style={{ fontSize: "var(--text-sm)" }}>
              <strong>Publish</strong> (hiển thị cho members)
            </span>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={save}
              disabled={saving || !title.trim()}
              style={{
                marginLeft: "auto",
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--brand-green)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Đang lưu…" : "Lưu"}
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
      </section>
    </div>
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
