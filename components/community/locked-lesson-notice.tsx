"use client";

import Link from "next/link";

export function LockedLessonNotice({
  communitySlug,
  courseSlug,
}: {
  communitySlug: string;
  courseSlug: string;
}) {
  return (
    <div
      style={{
        aspectRatio: "16/9",
        background: "var(--bg-elevated)",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        marginBottom: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ fontSize: 40 }}>🔒</div>
      <div
        style={{
          fontSize: "var(--text-md)",
          fontWeight: 700,
          color: "var(--text-heading)",
        }}
      >
        Bài học chưa được mở khoá
      </div>
      <div
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          textAlign: "center",
          maxWidth: 360,
          lineHeight: "var(--lh-relaxed)",
        }}
      >
        Hãy hoàn thành bài học trước để mở khoá bài này.
      </div>
      <Link
        href={`/c/${communitySlug}/courses/${courseSlug}`}
        style={{
          marginTop: "var(--space-2)",
          padding: "8px 20px",
          borderRadius: 8,
          background: "var(--brand-green)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          textDecoration: "none",
        }}
      >
        Quay lại bài trước
      </Link>
    </div>
  );
}
