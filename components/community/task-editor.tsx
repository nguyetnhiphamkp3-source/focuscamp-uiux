"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  updateTaskAction,
  deleteTaskAction,
} from "@/app/actions/challenge-review";
import { ConfirmModal } from "@/components/shared/confirm-modal";

/**
 * Admin-only inline task editor. Tiny '✎' button on each task row; opens
 * modal with all editable fields.
 */
export function TaskEditorButton({
  taskId,
  communitySlug,
  challengeSlug,
  initial,
}: {
  taskId: string;
  communitySlug: string;
  challengeSlug: string;
  initial: {
    title: string;
    description: string | null;
    sopContent: string | null;
    videoUrl: string | null;
    evidenceType: string;
    evidenceLabel: string | null;
    label: string | null;
    unlockAfterHours: number | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [sopContent, setSopContent] = useState(initial.sopContent ?? "");
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl ?? "");
  const [evidenceType, setEvidenceType] = useState(initial.evidenceType);
  const [evidenceLabel, setEvidenceLabel] = useState(
    initial.evidenceLabel ?? ""
  );
  const [label, setLabel] = useState(initial.label ?? "");
  const [unlockAfterHours, setUnlockAfterHours] = useState(
    initial.unlockAfterHours != null ? String(initial.unlockAfterHours) : ""
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function deleteTask() {
    setShowDeleteConfirm(true);
  }

  function confirmDeleteTask() {
    setShowDeleteConfirm(false);
    setErr(null);
    start(async () => {
      const res = await deleteTaskAction({
        taskId,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateTaskAction({
        taskId,
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
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <>
      <ConfirmModal
        open={showDeleteConfirm}
        title="Xoá task"
        message="Xoá task này? Submission liên quan cũng sẽ mất liên kết."
        confirmLabel="Xoá"
        danger
        onConfirm={confirmDeleteTask}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Sửa task (admin)"
        style={{
          padding: "2px 8px",
          borderRadius: 4,
          border: "1px solid var(--border-subtle)",
          background: "transparent",
          color: "var(--interactive-normal)",
          fontSize: "var(--text-xs)",
          cursor: "pointer",
        }}
      >
        ✎
      </button>

      {open && createPortal(
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
              Sửa Task
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
              <Field label="Tên task *">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  disabled={pending}
                  style={inputStyle}
                />
              </Field>

              <Field label="Label (vd: Kick-off, Final review)">
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
                  rows={4}
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
                  placeholder="https://www.youtube.com/embed/..."
                  disabled={pending}
                  style={inputStyle}
                />
              </Field>

              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}
              >
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
                <Field label="Yêu cầu cụ thể (evidence label)">
                  <input
                    type="text"
                    value={evidenceLabel}
                    onChange={(e) => setEvidenceLabel(e.target.value)}
                    maxLength={500}
                    disabled={pending}
                    placeholder="vd: Screenshot dashboard sau khi set KPI"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Override thời gian mở khóa (giờ) — để trống = dùng mặc định challenge">
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
                onClick={deleteTask}
                disabled={pending}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--danger)",
                  background: "transparent",
                  color: "var(--danger)",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                }}
              >
                🗑 Xoá task
              </button>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                style={{
                  marginLeft: "auto",
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
                onClick={save}
                disabled={pending || !title.trim()}
                style={{
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background: title.trim()
                    ? "var(--brand-green)"
                    : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: title.trim() ? "pointer" : "not-allowed",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
};
