"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Trash2, Loader2, AlertCircle } from "lucide-react";
import {
  deleteUploadedFile,
  uploadImage,
  type UploadContext,
} from "@/lib/upload-client";

const ICON_BTN: React.CSSProperties = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-card)",
  color: "var(--interactive-normal)",
  cursor: "pointer",
  flexShrink: 0,
};

type Shape = "circle" | "square" | "banner";

const SHAPE_STYLE: Record<Shape, React.CSSProperties> = {
  circle: { width: 72, height: 72, borderRadius: "50%" },
  square: { width: 72, height: 72, borderRadius: 12 },
  // Match actual banner render (16:9). Width responsive up to 280px.
  banner: {
    width: "100%",
    maxWidth: 280,
    aspectRatio: "16 / 9",
    borderRadius: 8,
  },
};

export function ImageUploadField({
  value,
  onChange,
  context,
  shape = "square",
  disabled = false,
  placeholder,
  size,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  context: UploadContext;
  shape?: Shape;
  disabled?: boolean;
  placeholder?: React.ReactNode;
  /** Override px size for circle/square avatars (default 72). */
  size?: number;
  /** @deprecated no longer rendered — size limit is shown via popup on error */
  maxSizeNote?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stagedUploadsRef = useRef(new Set<string>());
  const valueRef = useRef(value);
  valueRef.current = value;
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Auto-dismiss the error popup after a few seconds.
  useEffect(() => {
    if (!err) return;
    const t = window.setTimeout(() => setErr(null), 4000);
    return () => window.clearTimeout(t);
  }, [err]);

  useEffect(() => {
    const staged = stagedUploadsRef.current;
    const cleanup = () => {
      for (const url of staged) {
        if (url === valueRef.current) continue;
        void deleteUploadedFile(url);
      }
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, []);

  const dim =
    size && shape !== "banner"
      ? { width: size, height: size, borderRadius: shape === "circle" ? "50%" : 12 }
      : SHAPE_STYLE[shape];
  const avatarPx = typeof dim.width === "number" ? dim.width : 72;
  const badgePx = Math.max(26, Math.round(avatarPx * 0.2));
  const badgeIcon = Math.max(14, Math.round(badgePx * 0.55));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const previousValue = value;
      const url = await uploadImage(file, context);
      stagedUploadsRef.current.add(url);
      onChange(url);
      if (previousValue && stagedUploadsRef.current.delete(previousValue)) {
        void deleteUploadedFile(previousValue);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  }

  const overlay = shape !== "banner";

  const preview = value ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={value}
      alt="preview"
      referrerPolicy="no-referrer"
      style={{
        ...dim,
        objectFit: "cover",
        border: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      style={{
        ...dim,
        background: "var(--bg-card)",
        border: "1px dashed var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "var(--text-xs)",
        textAlign: "center",
        padding: 4,
        flexShrink: 0,
      }}
    >
      {placeholder || "Chưa có ảnh"}
    </div>
  );

  const uploadBtn = (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={disabled || uploading}
      title={uploading ? "Đang tải…" : value ? "Đổi ảnh" : "Tải ảnh lên"}
      aria-label={value ? "Đổi ảnh" : "Tải ảnh lên"}
      style={{ ...ICON_BTN, cursor: uploading ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}
    >
      {uploading ? <Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} /> : <Camera size={17} />}
    </button>
  );
  const deleteBtn = value ? (
    <button
      type="button"
      onClick={() => {
        if (stagedUploadsRef.current.delete(value)) void deleteUploadedFile(value);
        onChange(null);
      }}
      disabled={disabled || uploading}
      title="Xoá ảnh"
      aria-label="Xoá ảnh"
      style={{ ...ICON_BTN, background: "transparent", color: "var(--danger)" }}
    >
      <Trash2 size={16} />
    </button>
  ) : null;

  // Error popup (toast) — shown e.g. when the file exceeds the size limit.
  const toast = err ? (
    <div
      role="alert"
      onClick={() => setErr(null)}
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        maxWidth: "90vw",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "11px 16px",
        borderRadius: 10,
        background: "var(--danger)",
        color: "#fff",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
        cursor: "pointer",
        animation: "pm-pop 160ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <AlertCircle size={17} style={{ flexShrink: 0 }} />
      {err}
    </div>
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: overlay ? "flex-start" : "stretch", width: overlay ? "fit-content" : undefined }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={onPick}
        disabled={disabled}
        style={{ display: "none" }}
      />

      {overlay ? (
        <>
          {/* Avatar with camera badge in the corner */}
          <div style={{ position: "relative", ...dim, flexShrink: 0 }}>
            {preview}
            <div
              onClick={() => !disabled && !uploading && inputRef.current?.click()}
              title={uploading ? "Đang tải…" : value ? "Đổi ảnh" : "Tải ảnh lên"}
              aria-label={value ? "Đổi ảnh" : "Tải ảnh lên"}
              role="button"
              style={{
                position: "absolute",
                bottom: -3,
                right: -3,
                width: badgePx,
                height: badgePx,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-card)",
                border: "2px solid var(--bg-card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
                color: "var(--interactive-normal)",
                cursor: disabled || uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? <Loader2 size={badgeIcon} style={{ animation: "spin 0.8s linear infinite" }} /> : <Camera size={badgeIcon} />}
            </div>
            {deleteBtn && (
              <div
                onClick={() => {
                  if (value && stagedUploadsRef.current.delete(value)) void deleteUploadedFile(value);
                  onChange(null);
                }}
                title="Xoá ảnh"
                role="button"
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg-card)",
                  border: "2px solid var(--bg-card)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
                  color: "var(--danger)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={12} />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {preview}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {uploadBtn}
              {deleteBtn}
            </div>
          </div>
        </>
      )}
      {toast}
    </div>
  );
}
