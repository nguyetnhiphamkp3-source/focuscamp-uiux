"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateChallengeSettingsAction } from "@/app/actions/challenge-review";

/**
 * Inline admin settings panel on challenge detail page.
 * Collapsed by default; expand to tweak title / description / approval gate.
 */
export function ChallengeSettingsPanel({
  challengeId,
  communitySlug,
  challengeSlug,
  initial,
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
  initial: {
    title: string;
    description: string | null;
    requiresApproval: boolean;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [requiresApproval, setRequiresApproval] = useState(
    initial.requiresApproval
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateChallengeSettingsAction({
        challengeId,
        title: title.trim(),
        description: description.trim(),
        requiresApproval,
        communitySlug,
        challengeSlug,
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--header-primary)",
          fontSize: "var(--text-base)",
          fontWeight: 700,
          textAlign: "left",
        }}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>⚙️ Cài đặt challenge (admin)</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "var(--text-xs)",
            color: requiresApproval ? "var(--warning)" : "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          {requiresApproval ? "Yêu cầu duyệt" : "Tự động ACTIVE"}
        </span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Tiêu đề
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={pending}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Mô tả
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              disabled={pending}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>

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
            <div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--header-primary)",
                }}
              >
                Yêu cầu admin duyệt
              </div>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Khi bật: người tham gia phải chờ admin duyệt mới bắt đầu timer.
                Khi tắt (mặc định): auto ACTIVE + bắt đầu ngay.
              </div>
            </div>
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={save}
              disabled={pending || !title.trim()}
              style={{
                marginLeft: "auto",
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--brand-green)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>

          {err && (
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
                padding: "6px 10px",
                background: "rgba(218,55,60,0.08)",
                borderRadius: 6,
              }}
            >
              {err}
            </div>
          )}
          {saved && (
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--success)",
                padding: "6px 10px",
                background: "rgba(36,128,70,0.08)",
                borderRadius: 6,
              }}
            >
              ✓ Đã lưu
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
};
