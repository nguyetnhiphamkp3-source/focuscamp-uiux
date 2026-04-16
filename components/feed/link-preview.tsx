import { ytId } from "@/lib/brand";

/**
 * Auto-preview for common URL patterns inside post bodies.
 *
 * Rules:
 *   - First YouTube URL → responsive embed
 *   - First image URL (.jpg/.jpeg/.png/.webp/.gif) → inline <img>
 *
 * We render AT MOST ONE preview per post to keep the feed scannable.
 * If you need multi-embed, Phase 2 will build a dedicated media post type.
 */
export function LinkPreview({ body }: { body: string }) {
  const url = firstUrl(body);
  if (!url) return null;

  const yt = ytId(url);
  if (yt) {
    return (
      <div
        style={{
          marginTop: 10,
          aspectRatio: "16 / 9",
          borderRadius: 10,
          overflow: "hidden",
          background: "#000",
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        style={{
          marginTop: 10,
          maxWidth: "100%",
          maxHeight: 480,
          borderRadius: 10,
          border: "1px solid var(--border-subtle)",
          display: "block",
        }}
      />
    );
  }

  return null;
}

function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<]+/);
  return m ? m[0] : null;
}

function isImageUrl(url: string): boolean {
  // Strip query/hash for extension check
  const bare = url.split(/[?#]/)[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif|avif)$/.test(bare);
}
