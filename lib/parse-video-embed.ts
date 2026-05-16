/**
 * Convert a YouTube or Loom share URL to an embed URL.
 * Returns null if the URL is not recognized.
 */
export function parseVideoEmbed(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const loom = url.match(/loom\.com\/share\/([^?\s]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  return null;
}
