"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function PostImageLightbox({
  src,
  alt = "",
}: {
  src: string;
  alt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở ảnh bài viết"
        style={{
          display: "block",
          marginTop: 10,
          maxWidth: "100%",
          padding: 0,
          border: 0,
          background: "transparent",
          cursor: "zoom-in",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          style={{
            maxWidth: "100%",
            maxHeight: 480,
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            objectFit: "cover",
            display: "block",
          }}
        />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              background: "rgba(0, 0, 0, 0.82)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng ảnh"
              style={{
                position: "fixed",
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid rgba(255, 255, 255, 0.32)",
                background: "rgba(0, 0, 0, 0.48)",
                color: "#fff",
                fontSize: "var(--text-xl)",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              referrerPolicy="no-referrer"
              onClick={(event) => event.stopPropagation()}
              style={{
                maxWidth: "min(100%, 1200px)",
                maxHeight: "calc(100vh - 48px)",
                borderRadius: 8,
                objectFit: "contain",
                boxShadow: "0 20px 64px rgba(0, 0, 0, 0.48)",
                cursor: "zoom-out",
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
