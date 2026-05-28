"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChallengeAction } from "@/app/actions/challenge-review";
import { toSlug } from "@/lib/brand";
import { ImageUploadField } from "@/components/shared/image-upload-field";

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
  const [autoStartMode, setAutoStartMode] = useState<"manual" | "auto">("manual");
  const [autoStartHours, setAutoStartHours] = useState("24");
  const [taskUnlockMode, setTaskUnlockMode] = useState<"ALL" | "DAILY" | "SEQUENTIAL" | "DAILY_SEQUENTIAL" | "MANUAL">("DAILY");
  const [unlockIntervalHours, setUnlockIntervalHours] = useState("24");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
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
    start(async () => {
      const res = await createChallengeAction({
        communityId,
        communitySlug,
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty,
        requiredDays: parseInt(requiredDays, 10) || 21,
        autoStartAfterHours:
          autoStartMode === "auto"
            ? Math.min(Math.max(parseInt(autoStartHours, 10) || 24, 1), 8760)
            : null,
        bannerUrl: bannerUrl || undefined,
        taskUnlockMode,
        unlockIntervalHours: parseInt(unlockIntervalHours, 10) || 24,
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
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid var(--brand-green)",
          background: "var(--brand-green)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "var(--text-base)",
          cursor: "pointer",
          minHeight: 44,
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
              Tạo Challenge mới
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

              <Field label="Banner (tuỳ chọn)">
                <ImageUploadField
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  context="community"
                  shape="banner"
                  disabled={pending}
                  maxSizeNote="Tối đa 5MB"
                  placeholder="Chưa có banner — dùng gradient"
                />
              </Field>

              {/* Unlock mode */}
              <Field label="Chế độ mở khóa task">
                <select
                  value={taskUnlockMode}
                  onChange={(e) => setTaskUnlockMode(e.target.value as "ALL" | "DAILY" | "SEQUENTIAL" | "DAILY_SEQUENTIAL" | "MANUAL")}
                  disabled={pending}
                  style={inputStyle}
                >
                  <option value="ALL">Mở tất cả</option>
                  <option value="DAILY">Theo thời gian (mặc định 24h)</option>
                  <option value="SEQUENTIAL">Tuần tự (hoàn thành trước mở sau)</option>
                  <option value="DAILY_SEQUENTIAL">Lịch + Tuần tự (sau N giờ VÀ task trước phải xong)</option>
                  <option value="MANUAL">Thủ công (admin mở)</option>
                </select>
              </Field>
              {(taskUnlockMode === "DAILY" || taskUnlockMode === "DAILY_SEQUENTIAL") && (
                <Field label="Mỗi task mở sau (giờ)">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={unlockIntervalHours}
                    onChange={(e) => setUnlockIntervalHours(e.target.value)}
                    disabled={pending}
                    style={inputStyle}
                  />
                </Field>
              )}

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

              <div
                style={{
                  padding: "12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)" }}>
                  ⏱ Cách bắt đầu
                </div>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="newChallengeAutoStart"
                    checked={autoStartMode === "manual"}
                    onChange={() => setAutoStartMode("manual")}
                    disabled={pending}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)" }}>
                      Thủ công — member tự nhấn &quot;🚀 Bắt đầu&quot;
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                      Mặc định. Không nhấn = không chạy.
                    </div>
                  </div>
                </label>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="newChallengeAutoStart"
                    checked={autoStartMode === "auto"}
                    onChange={() => setAutoStartMode("auto")}
                    disabled={pending}
                    style={{ marginTop: 3 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: "var(--header-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      Tự động bắt đầu sau
                      <input
                        type="number"
                        min={1}
                        max={8760}
                        value={autoStartHours}
                        onChange={(e) => setAutoStartHours(e.target.value)}
                        onFocus={() => setAutoStartMode("auto")}
                        disabled={pending}
                        style={{ ...inputStyle, width: 80, padding: "4px 8px" }}
                      />
                      giờ kể từ lúc join
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                      Bấm Start trong grace → chạy ngay. Hết grace → tự chạy lúc joinedAt + N giờ.
                    </div>
                  </div>
                </label>
              </div>
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
