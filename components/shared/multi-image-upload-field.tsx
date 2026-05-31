"use client";

import { useRef, useState, useEffect } from "react";
import {
  deleteUploadedFile,
  uploadImage,
  type UploadContext,
} from "@/lib/upload-client";

/**
 * Multi-image upload field — up to `max` images. Mirrors ImageUploadField's
 * staged-upload cleanup (abandoned uploads are deleted on unmount/navigation)
 * but manages an ordered string[] instead of a single value.
 */
export function MultiImageUploadField({
  values,
  onChange,
  context,
  max = 3,
  disabled = false,
  maxSizeNote = "Tối đa 10MB",
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  context: UploadContext;
  max?: number;
  disabled?: boolean;
  maxSizeNote?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stagedUploadsRef = useRef(new Set<string>());
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Delete any staged-but-abandoned uploads (not in the final value) on unmount.
  useEffect(() => {
    const staged = stagedUploadsRef.current;
    const cleanup = () => {
      for (const url of staged) {
        if (valuesRef.current.includes(url)) continue;
        void deleteUploadedFile(url);
      }
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, []);

  const atMax = values.length >= max;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setErr(null);
    setUploading(true);
    try {
      const room = max - valuesRef.current.length;
      const batch = files.slice(0, room);
      const uploaded: string[] = [];
      for (const file of batch) {
        const url = await uploadImage(file, context);
        stagedUploadsRef.current.add(url);
        uploaded.push(url);
      }
      if (uploaded.length > 0) onChange([...valuesRef.current, ...uploaded]);
      if (files.length > room) {
        setErr(`Chỉ thêm được tối đa ${max} ảnh — đã bỏ qua ${files.length - room} ảnh.`);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(idx: number) {
    const url = values[idx];
    if (url && stagedUploadsRef.current.delete(url)) {
      void deleteUploadedFile(url);
    }
    onChange(values.filter((_, i) => i !== idx));
  }

  const tile: React.CSSProperties = {
    width: 96,
    height: 96,
    borderRadius: 8,
    objectFit: "cover",
    border: "1px solid var(--border-subtle)",
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        onChange={onPick}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {values.map((url, idx) => (
          <div key={url} style={{ position: "relative", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`evidence ${idx + 1}`} referrerPolicy="no-referrer" style={tile} />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              disabled={disabled || uploading}
              aria-label="Xoá ảnh"
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "none",
                background: "var(--danger)",
                color: "#fff",
                fontSize: 12,
                lineHeight: "20px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
        {!atMax && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            style={{
              ...tile,
              background: "var(--bg-card)",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: "var(--text-xs)",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>＋</span>
            {uploading ? "Đang tải…" : "Thêm ảnh"}
          </button>
        )}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: err ? "var(--danger)" : "var(--text-muted)" }}>
        {err || `JPG, PNG, WebP · ${maxSizeNote} · tối đa ${max} ảnh (${values.length}/${max})`}
      </div>
    </div>
  );
}
