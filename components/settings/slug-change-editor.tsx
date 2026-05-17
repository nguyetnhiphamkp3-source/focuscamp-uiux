"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeCommunitySlugAction } from "@/app/actions/community";
import { inputStyle, btnPrimary, SectionHeader } from "./editor-shared";

export function SlugChangeEditor({
  communityId,
  currentSlug,
  slugChangedAt,
}: {
  communityId: string;
  currentSlug: string;
  slugChangedAt: Date | null;
}) {
  const router = useRouter();
  const [newSlug, setNewSlug] = useState(currentSlug);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cooldownMs = 6 * 30 * 24 * 60 * 60 * 1000;
  const canChange = !slugChangedAt || Date.now() - new Date(slugChangedAt).getTime() >= cooldownMs;
  const nextChangeDate = slugChangedAt
    ? new Date(new Date(slugChangedAt).getTime() + cooldownMs)
    : null;

  function submit() {
    setErr(null);
    setSuccess(null);
    start(async () => {
      const res = await changeCommunitySlugAction({ communityId, newSlug: newSlug.trim() });
      if (res.ok) {
        setSuccess("Đã đổi URL thành công! Đang chuyển hướng...");
        setTimeout(() => router.push(`/c/${res.newSlug}/settings`), 1500);
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <div className="ui-card" style={{ marginBottom: "var(--space-4)", padding: "var(--space-4) var(--space-5)" }}>
      <SectionHeader title="URL cộng đồng" />
      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
        focus.camp/c/<strong>{currentSlug}</strong>
        {!canChange && nextChangeDate && (
          <span style={{ marginLeft: 8, color: "var(--warning)" }}>
            · Có thể đổi lại sau {nextChangeDate.toLocaleDateString("vi-VN")}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Slug mới (a-z, 0-9, dấu gạch ngang, 3-60 ký tự)
          </span>
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            maxLength={60}
            disabled={pending || !canChange}
            style={inputStyle}
            placeholder="my-community"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !canChange || newSlug.trim() === currentSlug || newSlug.trim().length < 3}
          style={{
            ...btnPrimary,
            opacity: pending || !canChange || newSlug.trim() === currentSlug ? 0.5 : 1,
            cursor: pending || !canChange ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "Đang đổi..." : "Đổi URL"}
        </button>
      </div>

      {!canChange && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
          Chỉ được đổi URL mỗi 6 tháng. Link cũ sẽ không tự chuyển hướng.
        </div>
      )}

      {err && (
        <div style={{ fontSize: "var(--text-sm)", color: "var(--danger)", marginTop: "var(--space-2)" }}>
          {err}
        </div>
      )}
      {success && (
        <div style={{ fontSize: "var(--text-sm)", color: "var(--success)", marginTop: "var(--space-2)" }}>
          {success}
        </div>
      )}
    </div>
  );
}
