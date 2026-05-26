"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReportAction } from "@/app/actions/content-report";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { fmtRelativeTime } from "@/lib/brand";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Quấy rối",
  SENSITIVE: "Nhạy cảm",
  RULE_VIOLATION: "Vi phạm nội quy",
  OTHER: "Khác",
};

const REASON_COLORS: Record<string, string> = {
  SPAM: "#e67e22",
  HARASSMENT: "#e74c3c",
  SENSITIVE: "#9b59b6",
  RULE_VIOLATION: "#e74c3c",
  OTHER: "#7f8c8d",
};

type Report = {
  id: string;
  targetType: string;
  reason: string;
  detail: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string | null; image: string | null };
  post: { id: string; body: string; user: { name: string | null } } | null;
  comment: { id: string; body: string; user: { name: string | null } } | null;
  resolvedBy: { id: string; name: string | null } | null;
};

export function ReportsPanel({
  reports,
  total,
  communitySlug,
  communityId,
}: {
  reports: Report[];
  total: number;
  communitySlug: string;
  communityId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function resolve(reportId: string, action: "DISMISS" | "DELETE_CONTENT") {
    setErr(null);
    start(async () => {
      const res = await resolveReportAction({ communitySlug, communityId, reportId, action });
      if (res.ok) {
        setConfirmDelete(null);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        Không có báo cáo nào.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>
        {total} báo cáo
      </div>
      {err && <div style={{ color: "var(--danger)", fontSize: "var(--text-xs)" }}>{err}</div>}

      {reports.map((r) => {
        const target = r.targetType === "POST" ? r.post : r.comment;
        const snippet = target?.body?.slice(0, 120) ?? "(nội dung đã bị xóa)";
        const authorName = target?.user?.name ?? "Ẩn danh";
        const isPending = r.status === "PENDING";

        return (
          <div
            key={r.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: REASON_COLORS[r.reason] ?? "#7f8c8d",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                {REASON_LABELS[r.reason] ?? r.reason}
              </span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                {r.targetType === "POST" ? "Bài viết" : "Bình luận"} của {authorName}
              </span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: "auto" }}>
                {fmtRelativeTime(r.createdAt)}
              </span>
            </div>

            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", marginBottom: 8, lineHeight: 1.4 }}>
              {snippet}{target?.body && target.body.length > 120 ? "…" : ""}
            </div>

            {r.detail && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 8, fontStyle: "italic" }}>
                Chi tiết: {r.detail}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-xs)" }}>
              <span style={{ color: "var(--text-muted)" }}>
                Báo cáo bởi {r.reporter.name ?? "Ẩn danh"}
              </span>

              {isPending ? (
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  {r.post && (
                    <a
                      href={`/c/${communitySlug}/p/${r.post.id}`}
                      style={{ color: "var(--brand-green)", textDecoration: "none" }}
                    >
                      Xem bài viết →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => resolve(r.id, "DISMISS")}
                    disabled={pending}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 4,
                      border: "1px solid var(--border-subtle)",
                      background: "transparent",
                      color: "var(--text-normal)",
                      cursor: pending ? "not-allowed" : "pointer",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(r.id)}
                    disabled={pending}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 4,
                      border: "none",
                      background: "var(--danger)",
                      color: "#fff",
                      cursor: pending ? "not-allowed" : "pointer",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    Xóa nội dung
                  </button>
                </div>
              ) : (
                <span style={{ marginLeft: "auto", color: r.status === "DISMISSED" ? "var(--text-muted)" : "var(--success)" }}>
                  {r.status === "DISMISSED" ? "Đã bỏ qua" : "Đã xóa nội dung"}
                  {r.resolvedBy && ` — ${r.resolvedBy.name}`}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <ConfirmModal
        open={!!confirmDelete}
        title="Xóa nội dung vi phạm"
        message="Xóa nội dung này? Hành động không thể hoàn tác."
        confirmLabel="Xóa"
        danger
        onConfirm={() => confirmDelete && resolve(confirmDelete, "DELETE_CONTENT")}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
