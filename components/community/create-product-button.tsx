"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "@/app/actions/marketplace";
import { toSlug } from "@/lib/brand";
import { FileUploadField } from "@/components/shared/file-upload-field";

export function CreateProductButton({
  communityId,
  communitySlug,
}: {
  communityId: string;
  communitySlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [type, setType] = useState("TEMPLATE");
  const [priceVnd, setPriceVnd] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [licenseKeyTemplate, setLicenseKeyTemplate] = useState("FC-{XXXX}-{XXXX}");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) {
      setSlug(toSlug(v));
    }
  }

  function submit() {
    setErr(null);
    const price = priceVnd ? Number(priceVnd) : 0;
    start(async () => {
      const res = await createProductAction({
        communityId,
        communitySlug,
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priceVnd: price,
        isFree: price === 0,
        externalUrl: externalUrl.trim() || undefined,
        fileUrl: fileUrl || undefined,
        licenseKeyTemplate:
          type === "LICENSE" ? licenseKeyTemplate.trim() || undefined : undefined,
      });
      if (res.ok && res.data) {
        setOpen(false);
        router.push(`/c/${communitySlug}/marketplace/${res.data.slug}`);
      } else if (!res.ok) {
        setErr(res.reason);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          background: "var(--brand-green)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "var(--text-base)",
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        + Tạo sản phẩm mới
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
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--header-primary)",
              }}
            >
              Tạo sản phẩm mới
            </div>

            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflowY: "auto",
              }}
            >
              <Field label="Tên sản phẩm *">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  maxLength={160}
                  disabled={pending}
                  autoFocus
                  style={inputStyle}
                />
              </Field>

              <Field label="Slug *" hint={`/marketplace/${slug || "[slug]"}`}>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    );
                    setSlugTouched(true);
                  }}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Loại">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={pending}
                    style={inputStyle}
                  >
                    <option value="TEMPLATE">📝 Template</option>
                    <option value="TOOL">🛠️ Tool</option>
                    <option value="SOP">📋 SOP</option>
                    <option value="BUNDLE">📦 Bundle</option>
                    <option value="PROMPT">💬 Prompt</option>
                    <option value="LICENSE">🔑 License (Software)</option>
                  </select>
                </Field>
                <Field label="Giá (VND, 0 = miễn phí)">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={priceVnd}
                    onChange={(e) => setPriceVnd(e.target.value)}
                    disabled={pending}
                    style={inputStyle}
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="Link sản phẩm (Notion / Drive / external — tuỳ chọn)">
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  disabled={pending}
                  placeholder="https://notion.so/..."
                  style={inputStyle}
                />
              </Field>

              <Field label="Hoặc upload file delivery (PDF / ZIP / video — tuỳ chọn)">
                <FileUploadField
                  value={fileUrl}
                  onChange={setFileUrl}
                  context="product-file"
                  disabled={pending}
                  accept=".pdf,.zip,.docx,.xlsx,.pptx,.mp4,.mov,.mp3,.txt,.csv,.md,application/pdf,application/zip,video/*,audio/*"
                  maxSizeNote="Tối đa 200MB. File chỉ deliver sau khi user mua thành công."
                />
              </Field>

              {type === "LICENSE" && (
                <Field
                  label="License key template"
                  hint="{XXXX} = 4 ký tự random. VD: FC-{XXXX}-{XXXX} → FC-A8K2-X9P4"
                >
                  <input
                    type="text"
                    value={licenseKeyTemplate}
                    onChange={(e) => setLicenseKeyTemplate(e.target.value)}
                    maxLength={80}
                    disabled={pending}
                    style={inputStyle}
                    placeholder="FC-{XXXX}-{XXXX}"
                  />
                </Field>
              )}
            </div>

            {err && (
              <div
                style={{
                  padding: "0 24px 8px",
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                }}
              >
                {err}
              </div>
            )}

            <div
              style={{
                padding: "16px 24px",
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
                  padding: "11px 20px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--interactive-normal)",
                  cursor: "pointer",
                  fontSize: "var(--text-base)",
                  minHeight: 44,
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !title.trim() || !slug.trim()}
                style={{
                  marginLeft: "auto",
                  padding: "11px 24px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    title.trim() && slug.trim()
                      ? "var(--brand-green)"
                      : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-base)",
                  minHeight: 44,
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Đang tạo…" : "Tạo sản phẩm"}
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
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-muted)" }}>
          {label}
        </span>
        {hint && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-base)",
  outline: "none",
  fontFamily: "inherit",
  minHeight: 44,
};
