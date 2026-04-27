"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUiConfigAction } from "@/app/actions/community-settings";
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
} from "@/lib/community-config";
import {
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

/**
 * Owner-only editor — toggle each feature menu link visibility for members.
 * Owner always sees full menu; this controls what NON-owners see.
 */
export function UiConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: { hiddenFeatures: FeatureKey[] };
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<FeatureKey>>(
    () => new Set(initial.hiddenFeatures),
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(key: FeatureKey) {
    setSaved(false);
    setErr(null);
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateUiConfigAction({
        communityId,
        communitySlug,
        hiddenFeatures: Array.from(hidden),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="Giao diện cho thành viên"
        subtitle="Tích để ẨN feature trong menu trái cho member. Bạn (owner) vẫn thấy đầy đủ — dùng nút mắt 👁 trên header để xem giả lập như member."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 8,
        }}
      >
        {FEATURE_KEYS.map((key) => {
          const isHidden = hidden.has(key);
          return (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: isHidden ? "rgba(218,55,60,0.06)" : "var(--bg-card)",
                border: `1px solid ${isHidden ? "rgba(218,55,60,0.3)" : "var(--border-subtle)"}`,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              <input
                type="checkbox"
                checked={isHidden}
                onChange={() => toggle(key)}
                disabled={pending}
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  flex: 1,
                  color: isHidden ? "var(--danger)" : "var(--header-primary)",
                  fontWeight: 500,
                  textDecoration: isHidden ? "line-through" : "none",
                }}
              >
                {FEATURE_LABELS[key]}
              </span>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                {isHidden ? "Đang ẩn" : "Hiện"}
              </span>
            </label>
          );
        })}
      </div>

      <div style={{ display: "flex", marginTop: 14 }}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{
            ...btnPrimary,
            marginLeft: "auto",
            opacity: pending ? 0.6 : 1,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
      </div>

      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
