"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "@/app/actions/posts";
import { avatarColorFor, initials } from "@/lib/brand";
import { uploadImage, deleteUploadedFile } from "@/lib/upload-client";
import type { PillarConfig } from "@/lib/community-config";

export function PostComposer({
  communityId,
  communitySlug,
  communityName,
  type = "POST",
  user,
  pillars = [],
  placeholder = "Chia sẻ điều gì đó với cộng đồng...",
  showTitle = true,
  showPillar = true,
}: {
  communityId: string;
  communitySlug: string;
  communityName?: string;
  type?: "POST" | "QUESTION" | "SIGNAL";
  user: { id: string; name: string | null; image: string | null };
  pillars?: PillarConfig[];
  placeholder?: string;
  showTitle?: boolean;
  showPillar?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pillar, setPillar] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const stagedUploads = useRef(new Set<string>());
  const imageUrlRef = useRef(imageUrl);
  imageUrlRef.current = imageUrl;

  useEffect(() => {
    const staged = stagedUploads.current;
    const onUnload = () => { for (const u of staged) void deleteUploadedFile(u); };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      for (const u of staged) {
        if (u !== imageUrlRef.current) void deleteUploadedFile(u);
      }
    };
  }, []);

  const canSubmit = !pending;
  const avatar = avatarColorFor(user.id);
  const letter = initials(user.name || "?");

  function reset() {
    setTitle(""); setBody(""); setPillar("");
    if (imageUrl && stagedUploads.current.delete(imageUrl)) void deleteUploadedFile(imageUrl);
    setImageUrl(null); setExpanded(false);
    setError(null); setImageError(null);
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    setImageUploading(true);
    try {
      const prev = imageUrlRef.current;
      const url = await uploadImage(file, "post");
      stagedUploads.current.add(url);
      setImageUrl(url);
      if (prev && stagedUploads.current.delete(prev)) void deleteUploadedFile(prev);
    } catch (ex) {
      setImageError(ex instanceof Error ? ex.message : "upload_failed");
    } finally {
      setImageUploading(false);
    }
  }

  function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("Cần nhập nội dung cho bài viết.");
      return;
    }
    start(async () => {
      const res = await createPostAction({
        communityId, communitySlug, type,
        title: title.trim() || undefined,
        body: body.trim(),
        pillar: pillar || undefined,
        imageUrl: imageUrl || undefined,
      });
      if (res.ok) {
        reset();
        // router.refresh() is unreliable on Next 16.2.3 prod (Server Action
        // id rotation across builds breaks RSC refetch). Hard reload is
        // bulletproof: brief flash but the new post is guaranteed visible.
        window.location.reload();
      } else {
        setError(res.reason);
      }
    });
  }

  function AvatarEl() {
    return user.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.image} alt="" className="feed-compose-avatar" style={{ objectFit: "cover" }} />
    ) : (
      <div className="feed-compose-avatar" style={{ background: avatar }}>{letter}</div>
    );
  }

  if (!expanded) {
    return (
      <div className="feed-compose">
        <AvatarEl />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            flex: 1, textAlign: "left", cursor: "text",
            border: "1px solid var(--border-subtle)", borderRadius: 8,
            background: "var(--bg-chat)", color: "var(--text-muted)",
            fontSize: "var(--text-base)", padding: "10px 12px",
          }}
        >
          {placeholder}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="feed-compose" style={{ flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 0" }}>
        <AvatarEl />
        <div style={{ lineHeight: 1.3 }}>
          <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-normal)" }}>
            {user.name || "Bạn"}
          </span>
          {communityName && (
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {" "}đang đăng trong <strong style={{ color: "var(--text-normal)" }}>{communityName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Content inputs */}
      <div style={{ padding: "8px 16px 12px" }}>
        {showTitle && (
          <input
            type="text"
            placeholder={type === "QUESTION" ? "Tiêu đề câu hỏi" : "Tiêu đề"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            disabled={pending}
            autoFocus
            style={{
              display: "block", width: "100%", border: "none", outline: "none",
              background: "transparent", fontSize: "var(--text-xl)", fontWeight: 700,
              color: "var(--text-normal)", padding: "6px 0", fontFamily: "var(--font-heading)",
            }}
          />
        )}
        <textarea
          placeholder={placeholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={10000}
          disabled={pending}
          autoFocus={!showTitle}
          style={{
            display: "block", width: "100%", border: "none", outline: "none",
            background: "transparent", resize: "none", minHeight: 72,
            fontSize: "var(--text-base)", fontFamily: "inherit", color: "var(--text-normal)",
            padding: "4px 0",
          }}
        />
        {imageUrl && (
          <div style={{ position: "relative", display: "inline-block", marginTop: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 8, objectFit: "cover", display: "block" }} />
            <button
              type="button"
              onClick={() => { if (stagedUploads.current.delete(imageUrl)) void deleteUploadedFile(imageUrl); setImageUrl(null); }}
              style={{
                position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%",
                background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", cursor: "pointer",
                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
          </div>
        )}
        {imageError && <p style={{ fontSize: "var(--text-xs)", color: "var(--danger)", margin: "4px 0 0" }}>{imageError}</p>}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-subtle)" }} />

      {/* Bottom toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", flexWrap: "wrap" }}>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={pickImage} disabled={pending || imageUploading} style={{ display: "none" }} />
        <button
          type="button"
          title={imageUploading ? "Đang tải…" : "Thêm ảnh"}
          onClick={() => imageInputRef.current?.click()}
          disabled={pending || imageUploading}
          style={{
            width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent",
            cursor: imageUploading ? "not-allowed" : "pointer",
            color: imageUploading ? "var(--brand-green)" : "var(--interactive-normal)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        <span style={{ flex: 1 }} />

        {showPillar && pillars.length > 0 && (
          <select
            value={pillar}
            onChange={(e) => setPillar(e.target.value)}
            disabled={pending}
            style={{
              padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)", color: "var(--text-normal)",
              fontSize: "var(--text-sm)", cursor: "pointer", maxWidth: 180,
            }}
          >
            <option value="">— Chọn Pillar —</option>
            {pillars.map((p) => (
              <option key={p.key} value={p.key}>{p.emoji ? `${p.emoji} ` : ""}{p.label}</option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={reset}
          disabled={pending}
          style={{
            padding: "7px 14px", borderRadius: 6, border: "1px solid var(--border-subtle)",
            background: "transparent", color: "var(--interactive-normal)",
            cursor: "pointer", fontSize: "var(--text-sm)", fontWeight: 500,
          }}
        >Huỷ</button>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "7px 18px", borderRadius: 6, border: "none",
            background: "var(--brand-green)",
            color: "#fff",
            fontWeight: 600, fontSize: "var(--text-sm)",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: pending ? 0.6 : 1, transition: "background 0.15s",
          }}
        >{pending ? "Đang đăng…" : "Đăng"}</button>
      </div>

      {error && <p style={{ fontSize: "var(--text-sm)", color: "var(--danger)", padding: "0 16px 12px", margin: 0 }}>{error}</p>}
    </form>
  );
}
