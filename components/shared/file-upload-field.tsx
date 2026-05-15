"use client";

import { useRef, useState } from "react";
import {
  deleteUploadedFile,
  uploadImage,
  type UploadContext,
} from "@/lib/upload-client";

/**
 * Generic file upload — same presigned-URL flow as ImageUploadField, but
 * accepts any file type allowed by the server context. Returns the public
 * URL (file is private; download routed through /api/products/<id>/download).
 */
export function FileUploadField({
  value,
  onChange,
  context,
  disabled = false,
  accept = "*/*",
  maxSizeNote = "Tối đa 200MB",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  context: UploadContext;
  disabled?: boolean;
  accept?: string;
  maxSizeNote?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stagedUploadsRef = useRef(new Set<string>());
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setUploading(true);
    setFileName(file.name);
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
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  const displayName = fileName || (value ? value.split("/").pop() : null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onPick}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "var(--bg-card)",
          border: `1px ${value ? "solid" : "dashed"} var(--border-subtle)`,
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>{value ? "📎" : "📁"}</span>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "var(--text-sm)",
            color: value ? "var(--header-primary)" : "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={displayName ?? ""}
        >
          {displayName || "Chưa có file"}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
            color: "var(--interactive-normal)",
            fontSize: "var(--text-sm)",
            cursor: uploading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {uploading ? "Đang tải…" : value ? "Đổi file" : "Chọn file"}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => {
              if (stagedUploadsRef.current.delete(value)) {
                void deleteUploadedFile(value);
              }
              onChange(null);
              setFileName(null);
            }}
            disabled={disabled}
            title="Xoá"
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: err ? "var(--danger)" : "var(--text-muted)",
        }}
      >
        {err || maxSizeNote}
      </span>
    </div>
  );
}
