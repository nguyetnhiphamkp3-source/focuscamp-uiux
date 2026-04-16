"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChallengeAction } from "@/app/actions/challenge-review";

export function CreateChallengeButton({
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
  const [difficulty, setDifficulty] = useState<"NORMAL" | "HARD" | "CHAOS">(
    "NORMAL"
  );
  const [requiredDays, setRequiredDays] = useState("21");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) {
      setSlug(
        v
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60)
      );
    }
  }

  function submit() {
    setErr(null);
    start(async () => {
      const res = await createChallengeAction({
        communityId,
        communitySlug,
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty,
        requiredDays: parseInt(requiredDays, 10) || 21,
        requiresApproval,
      });
      if (res.ok) {
        setOpen(false);
        router.push(`/c/${communitySlug}/challenges/${res.slug}`);
      } else {
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
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid var(--brand-green)",
          background: "var(--brand-green)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          cursor: "pointer",
        }}
      >
        + Tạo Challenge mới
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
              background: "var(--bg-main)",
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
                padding: "18px 20px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--header-primary)",
              }}
            >
              Tạo Challenge mới
            </div>

            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                overflowY: "auto",
              }}
            >
              <Field label="Tên challenge *">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  maxLength={120}
                  disabled={pending}
                  autoFocus
                  style={inputStyle}
                  placeholder="vd: Funnel 21 Ngày"
                />
              </Field>

              <Field
                label="Slug URL *"
                hint={`/c/${communitySlug}/challenges/${slug || "[slug]"}`}
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
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  placeholder="Challenge làm gì, dành cho ai, kết quả mong đợi..."
                />
              </Field>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px",
                  gap: 10,
                }}
              >
                <Field label="Độ khó">
                  <select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(
                        e.target.value as "NORMAL" | "HARD" | "CHAOS"
                      )
                    }
                    disabled={pending}
                    style={inputStyle}
                  >
                    <option value="NORMAL">🛡️ Normal</option>
                    <option value="HARD">⚔️ Hard</option>
                    <option value="CHAOS">🔥 Chaos</option>
                  </select>
                </Field>
                <Field label="Số ngày">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={requiredDays}
                    onChange={(e) => setRequiredDays(e.target.value)}
                    disabled={pending}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  padding: "8px 12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  disabled={pending}
                  style={{ marginTop: 3 }}
                />
                <div style={{ fontSize: "var(--text-sm)" }}>
                  <strong>Yêu cầu duyệt</strong> khi có người xin tham gia
                </div>
              </label>
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
                disabled={pending || !title.trim() || !slug.trim()}
                style={{
                  marginLeft: "auto",
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    title.trim() && slug.trim()
                      ? "var(--brand-green)"
                      : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Đang tạo…" : "Tạo Challenge"}
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
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
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
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
  fontFamily: "inherit",
};
