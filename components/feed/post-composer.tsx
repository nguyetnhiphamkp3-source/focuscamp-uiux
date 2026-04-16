"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "@/app/actions/posts";
import { PILLARS, avatarColorFor, initials } from "@/lib/brand";

export function PostComposer({
  communityId,
  communitySlug,
  type = "POST",
  user,
  placeholder = "Chia sẻ điều gì đó với cộng đồng...",
  showTitle = true,
  showPillar = true,
}: {
  communityId: string;
  communitySlug: string;
  type?: "POST" | "QUESTION" | "SIGNAL";
  user: { id: string; name: string | null; image: string | null };
  placeholder?: string;
  showTitle?: boolean;
  showPillar?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pillar, setPillar] = useState<string>("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = body.trim().length > 0 && !pending;
  const avatar = avatarColorFor(user.id);
  const letter = initials(user.name || "?");

  function reset() {
    setTitle("");
    setBody("");
    setPillar("");
    setExpanded(false);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createPostAction({
        communityId,
        communitySlug,
        type,
        title: title.trim() || undefined,
        body: body.trim(),
        pillar: pillar || undefined,
      });
      if (res.ok) {
        reset();
        router.refresh();
      } else {
        setError(res.reason);
      }
    });
  }

  if (!expanded) {
    return (
      <div className="feed-compose">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="feed-compose-avatar"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="feed-compose-avatar" style={{ background: avatar }}>
            {letter}
          </div>
        )}
        <button
          type="button"
          className="feed-compose-input"
          style={{ textAlign: "left", cursor: "text" }}
          onClick={() => setExpanded(true)}
        >
          {placeholder}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="feed-compose" style={{ flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="feed-compose-avatar"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="feed-compose-avatar" style={{ background: avatar }}>
            {letter}
          </div>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {showTitle && (
            <input
              type="text"
              className="feed-compose-input"
              placeholder={
                type === "QUESTION" ? "Tiêu đề câu hỏi (tuỳ chọn)" : "Tiêu đề (tuỳ chọn)"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={pending}
            />
          )}
          <textarea
            className="feed-compose-input"
            placeholder={placeholder}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={10000}
            disabled={pending}
            autoFocus
            style={{ resize: "vertical", minHeight: 96, fontFamily: "inherit" }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {showPillar ? (
          <select
            className="feed-compose-input"
            value={pillar}
            onChange={(e) => setPillar(e.target.value)}
            disabled={pending}
            style={{ maxWidth: 220, cursor: "pointer" }}
          >
            <option value="">— Chọn Pillar —</option>
            {PILLARS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        ) : (
          <span />
        )}

        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            style={{
              padding: "8px 14px",
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
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: canSubmit ? "var(--brand-green)" : "var(--bg-modifier-hover)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Đang đăng…" : "Đăng"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
            padding: "6px 10px",
            background: "rgba(218,55,60,0.08)",
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}
    </form>
  );
}
