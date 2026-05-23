"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCommentAction } from "@/app/actions/comments";
import { avatarColorFor, initials } from "@/lib/brand";

export function CommentComposer({
  postId,
  communitySlug,
  user,
  placeholder = "Viết bình luận…",
}: {
  postId: string;
  communitySlug: string;
  user: { id: string; name: string | null; image: string | null };
  placeholder?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!body.trim()) return;
    start(async () => {
      const res = await createCommentAction({
        postId,
        body: body.trim(),
        communitySlug,
      });
      if (res.ok) {
        setBody("");
        // router.refresh() unreliable on prod — hard reload to guarantee
        // the new comment shows up.
        window.location.reload();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        gap: 10,
        padding: 12,
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        marginTop: 16,
      }}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: avatarColorFor(user.id),
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "var(--text-sm)",
            flexShrink: 0,
          }}
        >
          {initials(user.name || "?")}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={5000}
          disabled={pending}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-chat)",
            color: "var(--text-normal)",
            fontSize: "var(--text-sm)",
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            minHeight: 50,
          }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {err && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>
              {err}
            </span>
          )}
          <button
            type="submit"
            disabled={!body.trim() || pending}
            style={{
              marginLeft: "auto",
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: body.trim() ? "var(--brand-green)" : "var(--bg-modifier-hover)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: body.trim() ? "pointer" : "not-allowed",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Đang gửi…" : "Gửi"}
          </button>
        </div>
      </div>
    </form>
  );
}
