"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTaskAction } from "@/app/actions/challenge-review";

/** "+ Thêm Task" button at the bottom of task list. Owner only. */
export function CreateTaskButton({
  challengeId,
  communitySlug,
  challengeSlug,
  nextDayNumber,
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
  /** Suggested day (last task + 1) */
  nextDayNumber: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dayNumber, setDayNumber] = useState(String(nextDayNumber));
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [sopContent, setSopContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState("TEXT");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [unlockAfterHours, setUnlockAfterHours] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    const day = parseInt(dayNumber, 10);
    if (!day || day < 1) {
      setErr("Day phải là số dương");
      return;
    }
    start(async () => {
      const res = await createTaskAction({
        challengeId,
        dayNumber: day,
        title: title.trim(),
        description: description.trim(),
        sopContent: sopContent.trim(),
        videoUrl: videoUrl.trim(),
        evidenceType: evidenceType as "TEXT" | "LINK" | "IMAGE",
        evidenceLabel: evidenceLabel.trim(),
        label: label.trim(),
        unlockAfterHours: unlockAfterHours.trim() ? parseInt(unlockAfterHours, 10) : null,
        communitySlug,
        challengeSlug,
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
    setDayNumber(String(nextDayNumber + 1));
    setTitle("");
    setLabel("");
    setDescription("");
    setSopContent("");
    setVideoUrl("");
    setEvidenceType("TEXT");
    setEvidenceLabel("");
    setUnlockAfterHours("");
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
        + Thêm Task cho Day {nextDayNumber}
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
              + Thêm Task
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
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10 }}>
                <Field label="Day *">
                  <input
                    type="number"
                    min={1}
                    value={dayNumber}
                    onChange={(e) => setDayNumber(e.target.value)}
                    disabled={pending}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Tên task *">
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
              </div>
              <Field label="Label (vd: Kick-off)">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={60}
                  disabled={pending}
                  style={inputStyle}
                />
              </Field>
              <Field label="Mô tả">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  disabled={pending}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </Field>
              <Field label="SOP / Hướng dẫn chi tiết">
                <textarea
                  value={sopContent}
                  onChange={(e) => setSopContent(e.target.value)}
                  rows={3}
                  maxLength={10000}
                  disabled={pending}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </Field>
              <Field label="Video URL (YouTube embed)">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={pending}
                  placeholder="https://www.youtube.com/embed/..."
                  style={inputStyle}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <Field label="Loại bằng chứng">
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    disabled={pending}
                    style={inputStyle}
                  >
                    <option value="TEXT">TEXT</option>
                    <option value="LINK">LINK</option>
                    <option value="IMAGE">IMAGE</option>
                  </select>
                </Field>
                <Field label="Yêu cầu cụ thể">
                  <input
                    type="text"
                    value={evidenceLabel}
                    onChange={(e) => setEvidenceLabel(e.target.value)}
                    maxLength={500}
                    disabled={pending}
                    style={inputStyle}
                  />
                </Field>
              </div>
              <Field label="Override mở khóa (giờ) — trống = mặc định">
                <input
                  type="number"
                  min={0}
                  max={720}
                  value={unlockAfterHours}
                  onChange={(e) => setUnlockAfterHours(e.target.value)}
                  disabled={pending}
                  placeholder="0 = mở ngay, 48 = sau 48h"
                  style={inputStyle}
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
                disabled={pending || !title.trim() || !dayNumber}
                style={{
                  marginLeft: "auto",
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    title.trim() && dayNumber
                      ? "var(--brand-green)"
                      : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Đang tạo…" : "Tạo Task"}
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
