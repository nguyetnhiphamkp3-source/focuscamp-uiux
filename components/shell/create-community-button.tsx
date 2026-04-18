"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createCommunityAction } from "@/app/actions/community";
import { toSlug } from "@/lib/brand";

/**
 * "+ Tạo cộng đồng" button — opens modal with form. Auto-generates slug
 * from name on the fly (user can override).
 */
export function CreateCommunityButton({
  variant = "server-list",
}: {
  /** 'server-list' = floating + icon; 'inline' = text button */
  variant?: "server-list" | "inline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) {
      // Auto-slugify
      setSlug(toSlug(v));
    }
  }

  function submit() {
    setErr(null);
    start(async () => {
      const res = await createCommunityAction({
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (res.ok) {
        setOpen(false);
        router.push(`/c/${res.slug}`);
      } else {
        setErr(res.reason);
      }
    });
  }

  function reset() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setTagline("");
    setDescription("");
    setErr(null);
  }

  // Use a <div> — NOT <button> — for the server-list icon because
  // <button> has browser-default padding/border/min-width that breaks
  // the 42×42 circle styling of .server-icon.add-server.
  const trigger =
    variant === "server-list" ? (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="server-icon add-server"
        title="Tạo cộng đồng mới"
      >
        +
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid var(--brand-green)",
          background: "transparent",
          color: "var(--brand-green)",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          cursor: "pointer",
        }}
      >
        + Tạo cộng đồng
      </button>
    );

  return (
    <>
      {trigger}

      {open && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) {
              setOpen(false);
              reset();
            }
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
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 540,
              width: "100%",
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
              Tạo cộng đồng mới
            </div>

            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <Field
                label="Tên cộng đồng *"
                hint="Hiển thị trên banner, search, Discovery"
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  maxLength={80}
                  disabled={pending}
                  placeholder="vd: The All In Plan"
                  style={inputStyle}
                  autoFocus
                />
              </Field>

              <Field
                label="Slug URL *"
                hint={`/c/${slug || "[slug]"} — chỉ a-z, 0-9, -`}
              >
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
                  placeholder="the-all-in-plan"
                  style={inputStyle}
                />
              </Field>

              <Field label="Tagline (tuỳ chọn)">
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={160}
                  disabled={pending}
                  placeholder="Dòng mô tả ngắn hiện trên banner"
                  style={inputStyle}
                />
              </Field>

              <Field label="Mô tả (tuỳ chọn)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  disabled={pending}
                  placeholder="Cộng đồng bạn muốn build về cái gì?"
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </Field>
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
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                Bạn sẽ là owner. Sau khi tạo vào{" "}
                <code>Settings</code> để thiết lập pillars, classes, currency.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
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
                disabled={pending || !name.trim() || !slug.trim()}
                style={{
                  padding: "11px 24px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    name.trim() && slug.trim()
                      ? "var(--brand-green)"
                      : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-base)",
                  minHeight: 44,
                  cursor:
                    name.trim() && slug.trim() && !pending
                      ? "pointer"
                      : "not-allowed",
                  opacity: pending ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {pending ? "Đang tạo…" : "Tạo cộng đồng"}
              </button>
              </div>
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
