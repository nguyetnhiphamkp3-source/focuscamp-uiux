/**
 * Brand helpers — gradients, initials, formatters.
 * Single source of truth. Import from here instead of re-declaring per file.
 */

export const BRAND_GRADIENTS = [
  "linear-gradient(135deg,#c77a2d,#8a4f1e)",
  "linear-gradient(135deg,#5865F2,#eb459e)",
  "linear-gradient(135deg,#1abc9c,#0d7c62)",
  "linear-gradient(135deg,#9b59b6,#6a3d72)",
  "linear-gradient(135deg,#f39c12,#d35400)",
  "linear-gradient(135deg,#2ecc71,#16a085)",
];

/** Pick a stable gradient for a string (e.g., community id) */
export function gradientFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return BRAND_GRADIENTS[Math.abs(hash) % BRAND_GRADIENTS.length];
}

/** 1 or 2 letter initials from a name */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Format VND amount with dots as thousand separator */
export function fmtVnd(n: number): string {
  return n.toLocaleString("vi-VN");
}

/** Format seconds as M:SS (e.g., 125 → "2:05") */
export function fmtDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Extract YouTube video ID from embed/watch/short URL; null if not recognized */
export function ytId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m =
    url.match(/embed\/([a-zA-Z0-9_-]{11})/) ||
    url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** YouTube thumbnail URL (mqdefault ~320x180) for any embed URL */
export function ytThumb(url: string | null | undefined): string | null {
  const id = ytId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

/* ======== Avatar colors (for anonymous / initials avatars) ======== */
export const AVATAR_COLORS = [
  "linear-gradient(135deg,#5865F2,#7289DA)",
  "linear-gradient(135deg,#2ecc71,#27ae60)",
  "linear-gradient(135deg,#e67e22,#d35400)",
  "linear-gradient(135deg,#1abc9c,#16a085)",
  "linear-gradient(135deg,#9b59b6,#8e44ad)",
  "linear-gradient(135deg,#e74c3c,#c0392b)",
  "linear-gradient(135deg,#f39c12,#d68910)",
];

export const NAME_COLORS = [
  "#c77a2d",
  "#2d8a4e",
  "#c26a15",
  "#1a8a72",
  "#7b4d9e",
  "#b8455a",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarColorFor(id: string): string {
  return AVATAR_COLORS[hashString(id) % AVATAR_COLORS.length];
}

export function nameColorFor(id: string): string {
  return NAME_COLORS[hashString(id) % NAME_COLORS.length];
}

/* ======== Relative time ("2 giờ trước") ======== */
export function fmtRelativeTime(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "hôm qua";
  if (diffDay < 7) return `${diffDay} ngày trước`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} tuần trước`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} tháng trước`;
  return `${Math.floor(diffDay / 365)} năm trước`;
}
