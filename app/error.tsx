"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "focus.camp:chunk-reload-path";

function isChunkLoadError(error: Error) {
  const message = error.message || "";
  return (
    error.name === "ChunkLoadError" ||
    message.includes("ChunkLoadError") ||
    message.includes("Failed to load chunk") ||
    message.includes("Loading chunk")
  );
}

function reloadCurrentPageOnce() {
  const path = window.location.pathname + window.location.search;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === path) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, path);
  } catch {
    // Storage can be unavailable in some browser modes; still try to recover.
  }
  window.location.reload();
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkLoadError = isChunkLoadError(error);

  useEffect(() => {
    console.error("[app error]", error);
    if (chunkLoadError) reloadCurrentPageOnce();
  }, [chunkLoadError, error]);

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
        <div style={{ fontSize: "var(--text-3xl)", marginBottom: 8 }}>💥</div>
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
        <button
          onClick={() => {
            if (chunkLoadError) {
              try {
                sessionStorage.removeItem(CHUNK_RELOAD_KEY);
              } catch {
                // Ignore storage failures; reload is the real recovery path.
              }
              window.location.reload();
              return;
            }
            reset();
          }}
          className="ui-btn ui-btn-primary"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
