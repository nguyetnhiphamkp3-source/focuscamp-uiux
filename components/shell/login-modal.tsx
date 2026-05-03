"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { loginWithGoogle } from "@/app/actions/auth";

export function LoginModal({
  trigger,
  redirectTo,
}: {
  trigger: React.ReactNode;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const returnTo = redirectTo || pathname || "/";

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        style={{ cursor: "pointer", display: "contents" }}
      >
        {trigger}
      </span>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 16, 10, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 16,
              padding: 32,
              position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: "var(--text-lg)",
                cursor: "pointer",
                borderRadius: 6,
              }}
            >
              ✕
            </button>
            <div style={{ fontSize: "var(--text-3xl)", marginBottom: 8 }}>🔥🏕️</div>
            <h1
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: 800,
                color: "var(--text-heading)",
                marginBottom: 6,
              }}
            >
              Đăng nhập focus.camp
            </h1>
            <p
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-muted)",
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Dùng tài khoản Google để đăng ký hoặc đăng nhập trong 1 click.
            </p>

            <form action={loginWithGoogle}>
              <input type="hidden" name="redirectTo" value={returnTo} />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  background: "var(--bg-elevated)",
                  color: "var(--text-heading)",
                  fontSize: "var(--text-base)",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <GoogleG />
                Tiếp tục với Google
              </button>
            </form>

            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                textAlign: "center",
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              Bằng cách đăng nhập, bạn đồng ý với Điều khoản &amp; Chính sách của
              focus.camp.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
