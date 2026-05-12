"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCommunityAction } from "@/app/actions/community-settings";
import { SectionHeader, inputStyle, ErrorBox } from "./editor-shared";

interface Props {
  communityId: string;
  communitySlug: string;
  communityName: string;
}

export function DangerZone({ communityId, communitySlug, communityName }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmSlug, setConfirmSlug] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const canDelete = confirmSlug === communitySlug;

  function handleDelete() {
    if (!canDelete) return;
    setErr(null);
    start(async () => {
      const res = await deleteCommunityAction({ communityId, communitySlug, confirmSlug });
      if (res.ok) {
        router.push("/");
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <div
      className="ui-card"
      style={{
        marginBottom: "var(--space-4)",
        padding: "var(--space-4) var(--space-5)",
        border: "1px solid var(--danger)",
      }}
    >
      <SectionHeader
        title="Danger Zone"
        subtitle="Xoá cộng đồng sẽ xoá vĩnh viễn toàn bộ thành viên, bài đăng, khoá học, đơn hàng và mọi dữ liệu liên quan. Không thể khôi phục."
      />

      <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
        Nhập slug <code style={{ color: "var(--danger)", background: "rgba(242,63,67,0.1)", padding: "1px 4px", borderRadius: 3 }}>{communitySlug}</code> để xác nhận:
      </div>

      <input
        style={{ ...inputStyle, maxWidth: 320 }}
        placeholder={communitySlug}
        value={confirmSlug}
        onChange={(e) => setConfirmSlug(e.target.value)}
        disabled={pending}
        spellCheck={false}
        autoComplete="off"
      />

      <ErrorBox msg={err} />

      <button
        disabled={!canDelete || pending}
        onClick={handleDelete}
        style={{
          marginTop: "var(--space-3)",
          padding: "8px 18px",
          borderRadius: 8,
          border: "none",
          background: canDelete && !pending ? "var(--danger)" : "rgba(242,63,67,0.3)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "var(--text-sm)",
          cursor: canDelete && !pending ? "pointer" : "not-allowed",
          transition: "background 0.15s",
        }}
      >
        {pending ? "Đang xoá…" : `Xoá cộng đồng "${communityName}"`}
      </button>
    </div>
  );
}
