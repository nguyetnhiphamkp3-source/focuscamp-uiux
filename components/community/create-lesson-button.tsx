"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLessonAction } from "@/app/actions/course";
import type { VideoSource } from "@/lib/brand";

const VIDEO_SOURCES: { value: VideoSource; label: string; placeholder: string; hint: string }[] = [
  { value: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/watch?v=...", hint: "Hỗ trợ: youtube.com/watch?v=, youtu.be/, youtube.com/embed/" },
  { value: "vimeo", label: "Vimeo", placeholder: "https://vimeo.com/123456789", hint: "Hỗ trợ: vimeo.com/VIDEO_ID, player.vimeo.com/video/VIDEO_ID" },
  { value: "bunny", label: "Bunny Stream", placeholder: "https://video.bunnycdn.com/play/library_id/video_id", hint: "Hỗ trợ: video.bunnycdn.com/play/LIB/VID hoặc iframe.mediadelivery.net/embed/LIB/VID" },
];

export function CreateLessonButton({
  courseId,
  communitySlug,
  courseSlug,
}: {
  courseId: string;
  communitySlug: string;
  courseSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [videoSource, setVideoSource] = useState<VideoSource>("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await createLessonAction({
        courseId,
        communitySlug,
        courseSlug,
        title: title.trim(),
        description: description.trim() || undefined,
        content: content.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        duration: (durationMin || durationSec) ? (parseInt(durationMin || "0", 10) * 60 + parseInt(durationSec || "0", 10)) : undefined,
      });
      if (res.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  function reset() {
    setTitle("");
    setDescription("");
    setContent("");
    setVideoSource("youtube");
    setVideoUrl("");
    setDurationMin("");
    setDurationSec("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 18px",
          borderRadius: 8,
          border: "1px dashed var(--border-subtle)",
          background: "transparent",
          color: "var(--brand-green)",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          cursor: "pointer",
          marginTop: "var(--space-3)",
          width: "100%",
        }}
      >
        + Thêm Lesson
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
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
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 640,
              width: "100%",
              maxHeight: "90vh",
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
              + Thêm Lesson
            </div>

            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                overflowY: "auto",
              }}
            >
              <Field label="Tên lesson *">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  disabled={pending}
                  autoFocus
                  style={inputStyle}
                />
              </Field>
              <Field label="Mô tả ngắn (tuỳ chọn)">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  disabled={pending}
                  style={inputStyle}
                />
              </Field>
              <Field label="Video URL">
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    value={videoSource}
                    onChange={(e) => setVideoSource(e.target.value as VideoSource)}
                    disabled={pending}
                    style={{ ...inputStyle, width: 130, flexShrink: 0 }}
                  >
                    {VIDEO_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    disabled={pending}
                    placeholder={VIDEO_SOURCES.find((s) => s.value === videoSource)?.placeholder}
                    style={inputStyle}
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  {VIDEO_SOURCES.find((s) => s.value === videoSource)?.hint}
                </div>
              </Field>
              <Field label="Thời lượng">
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number"
                    min={0}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    disabled={pending}
                    placeholder="0"
                    style={{ ...inputStyle, width: 80 }}
                  />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>phút</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    disabled={pending}
                    placeholder="0"
                    style={{ ...inputStyle, width: 80 }}
                  />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>giây</span>
                </div>
              </Field>
              <Field label="Nội dung bài học (markdown / text)">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  maxLength={20000}
                  disabled={pending}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </Field>
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
                onClick={() => !pending && setOpen(false)}
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
                onClick={submit}
                disabled={pending || !title.trim()}
                style={{
                  marginLeft: "auto",
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background: title.trim()
                    ? "var(--brand-green)"
                    : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Đang thêm…" : "Thêm Lesson"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {label}
      </span>
      {children}
    </label>
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
  fontFamily: "inherit",
};
