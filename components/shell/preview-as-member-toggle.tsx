"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye } from "lucide-react";

const COOKIE_NAME = "fc_preview_member";

function setCookie(value: "1" | "") {
  const maxAge = value ? 60 * 60 * 24 * 30 : 0; // 30d on, expire on off
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

/**
 * Owner-only toggle that flips a cookie so the layout filters feature menu
 * the same way members see it. Click again to switch back to full owner view.
 */
export function PreviewAsMemberToggle({ active }: { active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    setCookie(active ? "" : "1");
    start(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={active ? "Đang xem như member — click để xem đầy đủ" : "Xem giao diện như member"}
      aria-pressed={active}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--r-md)",
        background: active ? "var(--brand-green)" : "transparent",
        color: active ? "#fff" : "var(--text-muted)",
        border: "none",
        cursor: pending ? "not-allowed" : "pointer",
        flexShrink: 0,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <Eye size={16} />
    </button>
  );
}
