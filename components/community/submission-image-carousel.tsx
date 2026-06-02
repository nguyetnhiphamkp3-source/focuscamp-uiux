"use client";

import { useState } from "react";

/**
 * Swipeable/clickable carousel for check-in evidence images.
 * Single image → renders plain (no controls). Multiple → arrows + dots.
 */
export function SubmissionImageCarousel({
  images,
  alt = "evidence",
}: {
  images: string[];
  alt?: string;
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={images[0]}
        alt={alt}
        className="ch-submission-image"
        style={{ marginTop: "var(--space-2)" }}
      />
    );
  }

  const go = (dir: number) =>
    setIndex((i) => (i + dir + images.length) % images.length);

  return (
    <div style={{ marginTop: "var(--space-2)", position: "relative" }}>
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--bg-tertiary, rgba(0,0,0,0.04))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`${alt} ${index + 1}/${images.length}`}
          style={{
            display: "block",
            width: "100%",
            maxHeight: 360,
            objectFit: "contain",
          }}
        />
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Ảnh trước"
          style={navBtnStyle("left")}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Ảnh sau"
          style={navBtnStyle("right")}
        >
          →
        </button>
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "2px 8px",
            borderRadius: 10,
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "#fff",
            background: "rgba(0,0,0,0.55)",
          }}
        >
          {index + 1}/{images.length}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginTop: 6,
        }}
      >
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
              background:
                i === index ? "var(--brand-green)" : "var(--border-strong, #ccc)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

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
