"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Carousel for check-in evidence images with a click-to-zoom lightbox.
 *
 * - Renders every image inside a consistent framed box (object-fit: contain on a
 *   subtle backdrop) so a mix of big/small/portrait images displays uniformly —
 *   important for the admin review list. `compact` uses a fixed-height frame for
 *   even tighter, uniform tiles.
 * - Multiple images → arrows + dots; single image → plain framed thumbnail.
 * - Clicking any image opens a fullscreen lightbox (Esc / click-out to close,
 *   ←/→ to navigate). Self-contained — mirrors the feed lightbox pattern.
 */
export function SubmissionImageCarousel({
  images,
  alt = "evidence",
  compact = false,
}: {
  images: string[];
  alt?: string;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  useEffect(() => setMounted(true), []);

  const count = images.length;
  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, count]);

  if (count === 0) return null;
  const currentImage = images[index];
  const currentImageFailed = failedImages.has(currentImage);
  const markImageFailed = (url: string) => {
    setFailedImages((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  // compact → fixed-height letterboxed tiles (uniform across admin cards).
  // default → natural height capped, centered.
  const frameStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    overflow: "hidden",
    background: "var(--bg-tertiary, rgba(0,0,0,0.05))",
    border: "1px solid var(--border-subtle)",
    ...(compact ? { height: 200 } : { maxHeight: 420 }),
  };
  const imgStyle: React.CSSProperties = {
    display: "block",
    maxWidth: "100%",
    maxHeight: compact ? "100%" : 420,
    objectFit: "contain",
    cursor: "zoom-in",
  };

  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      <div style={frameStyle}>
        {currentImageFailed ? (
          <div style={missingImageStyle}>Ảnh bằng chứng không còn tồn tại</div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentImage}
            alt={count > 1 ? `${alt} ${index + 1}/${count}` : alt}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => markImageFailed(currentImage)}
            onClick={() => setOpen(true)}
            style={imgStyle}
          />
        )}
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước" style={navBtnStyle("left")}>
              ←
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Ảnh sau" style={navBtnStyle("right")}>
              →
            </button>
            <span style={counterStyle}>
              {index + 1}/{count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Tới ảnh ${i + 1}`}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: i === index ? "var(--brand-green)" : "var(--border-strong, #ccc)",
              }}
            />
          ))}
        </div>
      )}

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
              background: "rgba(0,0,0,0.82)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng ảnh"
              style={closeBtnStyle}
            >
              ×
            </button>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Ảnh trước"
                  style={lightboxNavStyle("left")}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Ảnh sau"
                  style={lightboxNavStyle("right")}
                >
                  ›
                </button>
              </>
            )}
            {currentImageFailed ? (
              <div style={{ ...missingImageStyle, color: "#fff", background: "rgba(255,255,255,0.1)" }}>
                Ảnh bằng chứng không còn tồn tại
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentImage}
                alt={alt}
                referrerPolicy="no-referrer"
                decoding="async"
                onError={() => markImageFailed(currentImage)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: "min(100%, 1200px)",
                  maxHeight: "calc(100vh - 48px)",
                  borderRadius: 8,
                  objectFit: "contain",
                  boxShadow: "0 20px 64px rgba(0,0,0,0.48)",
                  cursor: "zoom-out",
                }}
              />
            )}
            {count > 1 && (
              <span
                style={{
                  position: "fixed",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "4px 12px",
                  borderRadius: 12,
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "#fff",
                  background: "rgba(0,0,0,0.55)",
                }}
              >
                {index + 1} / {count}
              </span>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

const counterStyle: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  padding: "2px 8px",
  borderRadius: 10,
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "#fff",
  background: "rgba(0,0,0,0.55)",
};

const missingImageStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: 160,
  padding: "var(--space-4)",
  color: "var(--text-muted)",
  fontSize: "var(--text-sm)",
  textAlign: "center",
};

const closeBtnStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  width: 40,
  height: 40,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.32)",
  background: "rgba(0,0,0,0.48)",
  color: "#fff",
  fontSize: "var(--text-xl)",
  lineHeight: 1,
  cursor: "pointer",
};

function navBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.5)",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  };
}

function lightboxNavStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "fixed",
    top: "50%",
    [side]: 16,
    transform: "translateY(-50%)",
    width: 48,
    height: 48,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.32)",
    background: "rgba(0,0,0,0.48)",
    color: "#fff",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
  };
}
