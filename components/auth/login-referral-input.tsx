"use client";

import { useState } from "react";

/**
 * Optional referral code input for the login page.
 * Sets fc_ref cookie immediately on input so it's available
 * before any form submission (Google OAuth or magic link).
 */
export function LoginReferralInput() {
  const [value, setValue] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const code = e.target.value.trim();
    setValue(e.target.value);
    if (/^[A-Za-z0-9]{4,16}$/.test(code)) {
      document.cookie = `fc_ref=${code}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder="Nhập mã giới thiệu (nếu có)"
      maxLength={16}
      style={{
        width: "100%",
        minHeight: 44,
        padding: "0 var(--space-4)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-body)",
        color: "var(--text-heading)",
        fontSize: "var(--text-base)",
        boxSizing: "border-box",
      }}
    />
  );
}
