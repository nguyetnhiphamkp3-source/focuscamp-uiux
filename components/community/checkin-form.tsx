"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkinAction } from "@/app/actions/checkin";
import { ImageUploadField } from "@/components/shared/image-upload-field";

interface TodayTask {
  id: string;
  dayNumber: number;
  title: string;
  label: string | null;
  description: string | null;
  sopContent: string | null;
  videoUrl: string | null;
  evidenceType: string; // TEXT | LINK | IMAGE | FILE
  evidenceLabel: string | null;
}

function toYoutubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  if (url.includes("youtube.com/embed/")) return url;
  return null;
}

export function CheckinForm({
  challengeId,
  communitySlug,
  challengeSlug,
  task,
  deadlineLabel,
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
  task: TodayTask | null;
  deadlineLabel?: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sopOpen, setSopOpen] = useState(false);

  const evType = task?.evidenceType ?? "TEXT";
  const needsLink = evType === "LINK";
  const needsImage = evType === "IMAGE";
  const len = content.length;
  const linkOk = !needsLink || (linkUrl.trim().length > 0 && /^https?:\/\//.test(linkUrl));
  const imageOk = !needsImage || (imageUrl.trim().length > 0 && /^https?:\/\//.test(imageUrl));
  const canSubmit = len >= 5 && len <= 1000 && linkOk && imageOk && !pending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await checkinAction({
        challengeId,
        content,
        taskId: task?.id,
        dayNumber: task?.dayNumber,
        linkUrl: linkUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        if (res.redirectTo) {
          router.push(res.redirectTo);
          return;
        }
        setDone(true);
        setContent("");
        setLinkUrl("");
        setImageUrl("");
      } else {
        setError(res.reason || "unknown_error");
      }
    });
  }

  if (done) {
    return (
      <div
        className="ui-card"
        style={{
          textAlign: "center",
          background: "var(--success-soft)",
          border: "1px solid var(--success)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: "var(--space-2)" }}>🔥</div>
        <div
          style={{
            fontWeight: "var(--fw-bold)",
            color: "var(--brand-green-dark)",
            marginBottom: "var(--space-1)",
          }}
        >
          Check-in thành công · +5 XP
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Streak tiếp tục. Hẹn gặp lại ngày mai!
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div
        className="ui-card"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      >
        {/* Task header (current day) */}
        {task && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              alignItems: "flex-start",
              paddingBottom: "var(--space-3)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--r-full)",
                background: "var(--brand-green)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "var(--fw-extrabold)",
                flexShrink: 0,
                fontSize: "var(--text-sm)",
              }}
            >
              {task.dayNumber}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "var(--fw-semibold)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Task hôm nay{task.label ? ` · ${task.label}` : ""}
                {deadlineLabel && (
                  <span style={{ marginLeft: "var(--space-2)", color: "var(--warning)", fontWeight: "var(--fw-normal)" }}>
                    · Hạn nộp: {deadlineLabel}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "var(--text-md)",
                  fontWeight: "var(--fw-bold)",
                  color: "var(--text-heading)",
                  lineHeight: "var(--lh-snug)",
                }}
              >
                {task.title}
              </div>
              {task.description && (
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    marginTop: "var(--space-1)",
                    lineHeight: "var(--lh-normal)",
                  }}
                >
                  {task.description}
                </div>
              )}
              {task.sopContent && (
                <>
                  <button
                    type="button"
                    onClick={() => setSopOpen((v) => !v)}
                    style={{
                      marginTop: "var(--space-2)",
                      background: "transparent",
                      border: "none",
                      color: "var(--brand-green)",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--fw-bold)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {sopOpen ? "▾ Ẩn SOP" : "▸ Xem SOP các bước"}
                  </button>
                  {sopOpen && (
                    <div
                      style={{
                        marginTop: "var(--space-2)",
                        padding: "var(--space-3)",
                        background: "var(--bg-elevated)",
                        borderRadius: "var(--r-md)",
                        fontSize: "var(--text-sm)",
                        lineHeight: "var(--lh-relaxed)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {task.sopContent}
                    </div>
                  )}
                </>
              )}
              {task.videoUrl && (() => {
                const embedUrl = toYoutubeEmbed(task.videoUrl);
                if (!embedUrl) return null;
                return (
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--fw-semibold)",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      🎬 Video hướng dẫn
                    </div>
                    <div
                      style={{
                        position: "relative",
                        paddingBottom: "56.25%",
                        height: 0,
                        borderRadius: "var(--r-md)",
                        overflow: "hidden",
                        background: "#000",
                      }}
                    >
                      <iframe
                        src={embedUrl}
                        title="Video hướng dẫn"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Submission section */}
        <div>
          <div style={{ marginBottom: "var(--space-2)" }}>
            <label
              style={{
                fontSize: "var(--text-xs)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontWeight: "var(--fw-semibold)",
                display: "block",
                marginBottom: "var(--space-1)",
              }}
            >
              ✍️ Nộp bài — Bạn đã làm gì hôm nay?
            </label>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: "var(--lh-normal)" }}>
              {evType === "IMAGE"
                ? "Chụp ảnh màn hình hoặc ảnh bằng chứng, upload bên dưới và mô tả ngắn kết quả."
                : evType === "LINK"
                  ? "Dán link bài nộp (Notion, Google Doc, v.v.) và mô tả ngắn những gì bạn đã làm."
                  : "Mô tả ngắn kết quả bạn đạt được hôm nay — bài học, insight, hoặc việc đã hoàn thành."}
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ví dụ: Hôm nay tôi đã cài xong VS Code + Claude Desktop và thử chat với Claude lần đầu. Cảm giác…"
            rows={3}
            style={{
              width: "100%",
              padding: "var(--space-3)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-elevated)",
              fontSize: "var(--text-base)",
              color: "var(--text-normal)",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 80,
              outline: "none",
            }}
          />
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: len < 5 || len > 1000 ? "var(--danger)" : "var(--text-muted)",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {len} / 1000
          </div>
        </div>

        {/* Evidence: Link */}
        {needsLink && (
          <div>
            <label
              style={{
                fontSize: "var(--text-xs)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontWeight: "var(--fw-semibold)",
                display: "block",
                marginBottom: "var(--space-2)",
              }}
            >
              {task?.evidenceLabel || "Link chứng cứ (URL)"}{" "}
              {needsLink && <span style={{ color: "var(--danger)" }}>*</span>}
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://notion.so/… hoặc https://miro.com/…"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-elevated)",
                fontSize: "var(--text-sm)",
                color: "var(--text-normal)",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Evidence: Image upload */}
        {needsImage && (
          <div>
            <label
              style={{
                fontSize: "var(--text-xs)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontWeight: "var(--fw-semibold)",
                display: "block",
                marginBottom: "var(--space-2)",
              }}
            >
              {task?.evidenceLabel || "Ảnh chứng cứ"}{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <ImageUploadField
              value={imageUrl || null}
              onChange={(url) => setImageUrl(url ?? "")}
              context="checkin"
              shape="banner"
              disabled={pending}
              maxSizeNote="Tối đa 10MB"
            />
          </div>
        )}

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={!canSubmit}
            className="ui-btn ui-btn-primary"
          >
            {pending ? "Đang gửi…" : "Check-in (+5 XP)"}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--r-md)",
              background: "var(--danger-soft)",
              color: "var(--danger)",
              fontSize: "var(--text-sm)",
            }}
          >
            ❌{" "}
            {error === "already_checked_in_today"
              ? "Bạn đã check-in hôm nay rồi."
              : error === "not_a_member"
                ? "Bạn chưa tham gia challenge này."
                : `Lỗi: ${error}`}
          </div>
        )}
      </div>
    </form>
  );
}
