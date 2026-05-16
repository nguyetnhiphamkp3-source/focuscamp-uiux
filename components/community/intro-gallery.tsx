"use client";

import { useState } from "react";
import { parseVideoEmbed } from "@/lib/parse-video-embed";

export type GalleryItem = { type: "video" | "image"; url: string };

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}

function getThumbnail(item: GalleryItem): string | null {
  if (item.type === "video") {
    const ytId = getYouTubeId(item.url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    return null;
  }
  return item.url;
}

export function IntroGallery({ items }: { items: GalleryItem[] }) {
  const [selected, setSelected] = useState(0);
  if (items.length === 0) return null;

  const current = items[selected];
  const embedUrl = current.type === "video" ? parseVideoEmbed(current.url) : null;

  return (
    <div>
      {/* Main display */}
      <div
        style={{
          position: "relative",
          paddingBottom: "56.25%",
          height: 0,
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          border: "1px solid var(--border-subtle)",
          background: "#000",
        }}
      >
        {current.type === "video" && embedUrl ? (
          <iframe
            key={selected}
            src={embedUrl}
            title="Video giới thiệu"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={selected}
            src={current.url}
            alt=""
            referrerPolicy="no-referrer"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>

      {/* Thumbnail strip — only when >1 item */}
      {items.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-2)",
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          {items.map((item, i) => {
            const thumb = getThumbnail(item);
            const isActive = i === selected;
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                style={{
                  flexShrink: 0,
                  width: 100,
                  height: 60,
                  borderRadius: "var(--r-md)",
                  overflow: "hidden",
                  border: isActive ? "2px solid var(--brand-green)" : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                  background: "var(--bg-elevated)",
                  position: "relative",
                  opacity: isActive ? 1 : 0.7,
                  transition: "opacity 0.15s, border-color 0.15s",
                }}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    referrerPolicy="no-referrer"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: "var(--text-muted)",
                  }}>
                    {item.type === "video" ? "▶" : "🖼"}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
