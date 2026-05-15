"use client";

import { useRef, useState, useEffect } from "react";
import {
  deleteUploadedFile,
  uploadImage,
  type UploadContext,
} from "@/lib/upload-client";

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
  const stagedUploadsRef = useRef(new Set<string>());
  const valueRef = useRef(value);
  valueRef.current = value;
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const staged = stagedUploadsRef.current;
    const onBeforeUnload = () => {
      for (const url of staged) void deleteUploadedFile(url);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      for (const url of staged) {
        if (url === valueRef.current) continue;
        void deleteUploadedFile(url);
      }
    };
  }, []);

  const dim = SHAPE_STYLE[shape];

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={onPick}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--interactive-normal)",
              fontSize: "var(--text-sm)",
              cursor: uploading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {uploading ? "Đang tải…" : value ? "Đổi ảnh" : "Tải ảnh lên"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                if (stagedUploadsRef.current.delete(value)) {
                  void deleteUploadedFile(value);
                }
                onChange(null);
              }}
              disabled={disabled || uploading}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Xoá
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: err ? "var(--danger)" : "var(--text-muted)",
        }}
      >
        {err || `JPG, PNG, WebP · ${maxSizeNote}`}
      </div>
    </div>
  );
}
