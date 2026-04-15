"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div className="ui-card ui-card-lg" style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💥</div>
        <h1 style={{ fontSize: "var(--text-xl)", marginBottom: 8 }}>
          Có lỗi xảy ra
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            marginBottom: 16,
            lineHeight: "var(--lh-normal)",
          }}
        >
          {error.message || "Không xác định — đã báo log."}
        </p>
        {error.digest && (
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            Digest: {error.digest}
          </div>
        )}
        <button onClick={reset} className="ui-btn ui-btn-primary">
          Thử lại
        </button>
      </div>
    </div>
  );
}
