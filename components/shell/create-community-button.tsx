"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createCommunityAction } from "@/app/actions/community";
import { toSlug, fmtVnd } from "@/lib/brand";
import { COMMUNITY_CATEGORIES } from "@/lib/community-categories";
import {
  DEFAULT_PLATFORM_PLAN_TIER,
  DISPLAY_PLATFORM_PLAN_TIERS,
  PLATFORM_PLAN_DISPLAY,
  PLATFORM_PLANS,
} from "@/lib/platform-plans";

// Tạm thời disable luồng tạo community public. Flip về false để bật lại modal full.
const CREATION_DISABLED = false;
const DISABLED_AVATAR_URL =
  "https://pub-8cc0aba616ff4e23a1298f6aa8b318d8.r2.dev/community/cmnzkjmx10000cb7zui6cjdrc/1778573696488-80b7ce.png";

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
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const plan = PLATFORM_PLANS[DEFAULT_PLATFORM_PLAN_TIER];

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
        category: category || undefined,
        description: description.trim() || undefined,
        planTier: DEFAULT_PLATFORM_PLAN_TIER,
      });
      if (res.ok) {
        setOpen(false);
        router.push(`/pay/${res.paymentCode}`);
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
    setCategory("");
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

      {open && CREATION_DISABLED && typeof document !== "undefined" && createPortal(
        <DisabledNotice onClose={() => setOpen(false)} />,
        document.body
      )}

      {open && !CREATION_DISABLED && typeof document !== "undefined" && createPortal(
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
            padding: "var(--space-4)",
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: "var(--r-xl)",
              border: "1px solid var(--border-subtle)",
              maxWidth: 540,
              maxHeight: "calc(100dvh - var(--space-8))",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                padding: "var(--space-4) var(--space-6)",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--header-primary)",
                flexShrink: 0,
              }}
            >
              Tạo cộng đồng mới
            </div>

            <div
              style={{
                padding: "var(--space-4) var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
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

              <Field label="Category (tuỳ chọn)" hint="Dùng cho Discovery filter">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={pending}
                  style={inputStyle}
                >
                  <option value="">Chưa chọn</option>
                  {COMMUNITY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
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

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                  }}
                >
                  Chọn gói (thanh toán hàng tháng) *
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  {DISPLAY_PLATFORM_PLAN_TIERS.map((tier) => {
                    const option = PLATFORM_PLAN_DISPLAY[tier];
                    const optionPlan = PLATFORM_PLANS[tier];
                    const selected = tier === DEFAULT_PLATFORM_PLAN_TIER;
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={!option.available || pending}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 8,
                          border: `2px solid ${selected ? "var(--brand-green)" : "var(--border-subtle)"}`,
                          background: selected ? "rgba(27,158,117,0.08)" : "var(--bg-card)",
                          color: "var(--text-normal)",
                          cursor: option.available && !pending ? "default" : "not-allowed",
                          textAlign: "left",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          opacity: option.available ? 1 : 0.58,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "var(--text-base)",
                              color: selected ? "var(--brand-green)" : "var(--header-primary)",
                            }}
                          >
                            {option.label}
                          </span>
                          {option.badge && (
                            <span
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--text-muted)",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--header-primary)",
                            fontWeight: 600,
                          }}
                        >
                          {option.available ? `${fmtVnd(optionPlan.priceVnd)}đ` : "Coming soon"}
                          {option.available && (
                            <span
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--text-muted)",
                                fontWeight: 400,
                              }}
                            >
                              /tháng
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {plan.features.map((f: string, i: number) => (
                    <div key={i}>· {f}</div>
                  ))}
                </div>
              </div>
            </div>

            {err && (
              <div
                style={{
                  padding: "0 var(--space-6) var(--space-2)",
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                  flexShrink: 0,
                }}
              >
                {err}
              </div>
            )}

            <div
              style={{
                padding: "var(--space-3) var(--space-6)",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                flexShrink: 0,
                background: "var(--bg-floating)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                Bấm Tiếp tục → quét QR thanh toán {fmtVnd(plan.priceVnd)}đ qua SePay.
                Sau khi giao dịch xong cộng đồng sẽ active 30 ngày.
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
                {pending ? "Đang tạo…" : "Tiếp tục → thanh toán"}
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

function DisabledNotice({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          background: "var(--bg-floating)",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border-subtle)",
          maxWidth: 420,
          width: "100%",
          padding: "var(--space-6)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-4)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, width: "100%", justifyContent: "center" }}>
          <img
            src={DISABLED_AVATAR_URL}
            alt="Lửng Mật"
            width={88}
            height={88}
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              border: "2px solid var(--border-subtle)",
            }}
          />
          <div
            style={{
              position: "relative",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 16,
              padding: "12px 16px",
              fontSize: "var(--text-base)",
              color: "var(--text-normal)",
              lineHeight: 1.4,
              maxWidth: 240,
              textAlign: "left",
            }}
          >
            Liên hệ <strong>Dương Trọng Nghĩa</strong> để đồng hành cùng nhau nhé!
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: -8,
                bottom: 14,
                width: 0,
                height: 0,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderRight: "8px solid var(--bg-card)",
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "11px 24px",
            borderRadius: 8,
            border: "none",
            background: "var(--brand-green)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "var(--text-base)",
            minHeight: 44,
            cursor: "pointer",
          }}
        >
          Đã hiểu
        </button>
      </div>
    </div>
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
