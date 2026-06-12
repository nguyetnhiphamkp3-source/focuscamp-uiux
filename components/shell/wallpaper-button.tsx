"use client";

import { useEffect, useRef } from "react";
import { ImageIcon } from "lucide-react";

const STORAGE_KEY = "fc-wallpaper";

/** Apply a wallpaper data-URL (or null to reset to the default webp). */
function applyWallpaper(url: string | null) {
  const root = document.documentElement;
  if (url) root.style.setProperty("--app-wallpaper", `url("${url}")`);
  else root.style.removeProperty("--app-wallpaper");
}

/** Downscale the picked image to keep it light enough for localStorage. */
function downscale(file: File, maxW = 2560): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas ctx"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function WallpaperButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore saved wallpaper on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) applyWallpaper(saved);
    } catch {
      /* ignore */
    }
  }, []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      const dataUrl = await downscale(file);
      localStorage.setItem(STORAGE_KEY, dataUrl);
      applyWallpaper(dataUrl);
    } catch {
      /* ignore bad image / quota */
    }
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    applyWallpaper(null);
  }

  return (
    <>
      <button
        type="button"
        className="up-action"
        title="Đổi hình nền (chuột phải để khôi phục mặc định)"
        onClick={() => inputRef.current?.click()}
        onContextMenu={(e) => {
          e.preventDefault();
          reset();
        }}
      >
        <ImageIcon size={20} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
    </>
  );
}
