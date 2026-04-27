"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
    </button>
  );
}
