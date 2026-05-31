"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resubmitCheckinAction } from "@/app/actions/challenge-resubmit";
import { MultiImageUploadField } from "@/components/shared/multi-image-upload-field";
import { MAX_CHECKIN_IMAGES } from "@/lib/checkin-images";

export function ResubmitForm({
  checkinId,
  communitySlug,
  challengeSlug,
  initial,
  evidenceType,
  rejectCount,
  maxRejects = 2,
}: {
  checkinId: string;
  communitySlug: string;
  challengeSlug: string;
  initial: { content: string; linkUrl: string | null; imageUrls: string[] };
  evidenceType: string;
  rejectCount: number;
  maxRejects?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(initial.content);
  const [linkUrl, setLinkUrl] = useState(initial.linkUrl ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(initial.imageUrls ?? []);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const atCap = rejectCount >= maxRejects;
  const trimmedLen = content.trim().length;
  const hasText = trimmedLen >= 5;
  const hasImage = imageUrls.length > 0;
  const needsLink = evidenceType === "LINK";
  const needsImage = evidenceType === "IMAGE";
  const allowsImage = evidenceType === "IMAGE" || evidenceType === "TEXT_IMAGE";
  const isTextImage = evidenceType === "TEXT_IMAGE";
  const canSubmit =
    !pending &&
    content.length <= 2000 &&
    (isTextImage
      ? (trimmedLen === 0 || hasText) && (hasText || hasImage)
      : hasText) &&
    (!needsLink || /^https?:\/\//.test(linkUrl.trim())) &&
    (!needsImage || hasImage);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await resubmitCheckinAction({
        checkinId,
        content,
        linkUrl: linkUrl.trim() || undefined,
        imageUrls: imageUrls.length ? imageUrls : undefined,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  if (atCap) {
    return (
      <div
        style={{
          marginTop: "var(--space-2)",
          padding: "6px 10px",
          fontSize: "var(--text-xs)",
          color: "var(--danger)",
          background: "rgba(218,55,60,0.08)",
          borderRadius: 6,
        }}
      >
        Đã bị từ chối {rejectCount} lần, bạn không thể nộp lại được nữa
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: "var(--space-2)",
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--brand-green)",
          background: "transparent",
          color: "var(--brand-green)",
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ↻ Nộp lại {rejectCount > 0 ? `(còn ${maxRejects - rejectCount} lượt)` : ""}
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: "var(--space-2)",
        padding: 10,
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginBottom: 6,
        }}
      >
        Sửa lại theo góp ý của admin rồi nộp.{" "}
        {rejectCount > 0 && (
          <>Còn <strong>{maxRejects - rejectCount}</strong> lượt.</>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={pending}
        style={inputStyle}
        placeholder="Nội dung check-in…"
      />
      <div
        style={{
          display: "grid",
          gap: 8,
          marginTop: 6,
        }}
      >
        {needsLink && (
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Link bằng chứng (https://…)"
          disabled={pending}
          style={inputStyle}
        />
        )}
        {allowsImage && (
          <MultiImageUploadField
            values={imageUrls}
            onChange={setImageUrls}
            context="checkin"
            max={MAX_CHECKIN_IMAGES}
            disabled={pending}
            maxSizeNote="Tối đa 10MB"
          />
        )}
      </div>
      {err && (
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            marginTop: 6,
          }}
        >
          {err}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 6,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "transparent",
            color: "var(--interactive-normal)",
            fontSize: "var(--text-xs)",
            cursor: "pointer",
          }}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background: "var(--brand-green)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "var(--text-xs)",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Đang gửi…" : "Gửi lại"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
  fontFamily: "inherit",
};
