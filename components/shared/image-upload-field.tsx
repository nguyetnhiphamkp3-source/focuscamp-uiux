"use client";

import { useRef, useState } from "react";
import { uploadImage, type UploadContext } from "@/lib/upload-client";

type Shape = "circle" | "square" | "banner";

const SHAPE_STYLE: Record<
  Shape,
  { width: number; height: number; borderRadius: number | string }
> = {
  circle: { width: 72, height: 72, borderRadius: "50%" },
  square: { width: 72, height: 72, borderRadius: 12 },
  banner: { width: 200, height: 80, borderRadius: 8 },
};

export function ImageUploadField({
  value,
  onChange,
  context,
  shape = "square",
  disabled = false,
  placeholder,
  maxSizeNote = "Tối đa 5MB",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  context: UploadContext;
  shape?: Shape;
  disabled?: boolean;
  placeholder?: React.ReactNode;
  maxSizeNote?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dim = SHAPE_STYLE[shape];

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadImage(file, context);
      onChange(url);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="preview"
            referrerPolicy="no-referrer"
            style={{
              ...dim,
              objectFit: "cover",
              border: "1px solid var(--border-subtle)",
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
            }}
          >
            {placeholder || "Chưa có ảnh"}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={onPick}
            disabled={disabled}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              style={{
                padding: "7px 12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-card)",
                color: "var(--interactive-normal)",
                fontSize: "var(--text-sm)",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Đang tải…" : value ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled || uploading}
                style={{
                  padding: "7px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  cursor: "pointer",
                }}
              >
                Xoá
              </button>
            )}
          </div>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            JPG, PNG, WebP. {maxSizeNote}.
          </span>
        </div>
      </div>
      {err && (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {err}
        </span>
      )}
    </div>
  );
}
