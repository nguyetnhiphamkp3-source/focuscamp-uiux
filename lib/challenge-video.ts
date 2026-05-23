export type ChallengeBannerMediaType = "IMAGE" | "VIDEO";
export type ChallengeVideoProvider = "youtube" | "vimeo" | "wistia";

export type ParsedChallengeVideo = {
  provider: ChallengeVideoProvider;
  id: string;
  canonicalUrl: string;
  embedUrl: string;
};

export type ResolvedChallengeVideo = ParsedChallengeVideo & {
  thumbnailUrl: string | null;
};

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function getUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

function youtubeIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  }
  if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) {
    return null;
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const embedIndex = pathParts.indexOf("embed");
  if (embedIndex >= 0) {
    const id = pathParts[embedIndex + 1];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  }

  const shortsIndex = pathParts.indexOf("shorts");
  if (shortsIndex >= 0) {
    const id = pathParts[shortsIndex + 1];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  }

  const liveIndex = pathParts.indexOf("live");
  if (liveIndex >= 0) {
    const id = pathParts[liveIndex + 1];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  }

  const id = url.searchParams.get("v");
  return id && YOUTUBE_ID_RE.test(id) ? id : null;
}

function vimeoPartsFromUrl(url: URL): { id: string; hash: string | null } | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!host.endsWith("vimeo.com")) return null;

  const pathParts = url.pathname.split("/").filter(Boolean);
  const playerIndex = pathParts.indexOf("video");
  const idFromPlayer = playerIndex >= 0 ? pathParts[playerIndex + 1] : null;
  const id = idFromPlayer && /^\d+$/.test(idFromPlayer)
    ? idFromPlayer
    : [...pathParts].reverse().find((part) => /^\d+$/.test(part));
  if (!id) return null;

  const idIndex = pathParts.indexOf(id);
  const hashFromPath = idIndex >= 0 ? pathParts[idIndex + 1] : null;
  const hash = url.searchParams.get("h") || (hashFromPath && !/^\d+$/.test(hashFromPath) ? hashFromPath : null);
  return { id, hash };
}

function wistiaIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!host.endsWith("wistia.com") && !host.endsWith("wistia.net") && !host.endsWith("wi.st")) {
    return null;
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const iframeIndex = pathParts.indexOf("iframe");
  if (iframeIndex >= 0) {
    const id = pathParts[iframeIndex + 1];
    return id && /^[A-Za-z0-9]{10}$/.test(id) ? id : null;
  }

  const mediasIndex = pathParts.indexOf("medias");
  if (mediasIndex >= 0) {
    const id = pathParts[mediasIndex + 1];
    return id && /^[A-Za-z0-9]{10}$/.test(id) ? id : null;
  }

  return null;
}

export function parseChallengeVideoUrl(raw: string | null | undefined): ParsedChallengeVideo | null {
  if (!raw?.trim()) return null;
  const url = getUrl(raw);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return null;

  const youtubeId = youtubeIdFromUrl(url);
  if (youtubeId) {
    return {
      provider: "youtube",
      id: youtubeId,
      canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  const vimeo = vimeoPartsFromUrl(url);
  if (vimeo) {
    const hashQuery = vimeo.hash ? `?h=${encodeURIComponent(vimeo.hash)}` : "";
    const hashPath = vimeo.hash ? `/${encodeURIComponent(vimeo.hash)}` : "";
    return {
      provider: "vimeo",
      id: vimeo.id,
      canonicalUrl: `https://vimeo.com/${vimeo.id}${hashPath}`,
      embedUrl: `https://player.vimeo.com/video/${vimeo.id}${hashQuery}`,
    };
  }

  const wistiaId = wistiaIdFromUrl(url);
  if (wistiaId) {
    return {
      provider: "wistia",
      id: wistiaId,
      canonicalUrl: `https://fast.wistia.com/embed/iframe/${wistiaId}`,
      embedUrl: `https://fast.wistia.net/embed/iframe/${wistiaId}`,
    };
  }

  return null;
}

function fallbackThumbnail(info: ParsedChallengeVideo): string | null {
  if (info.provider === "youtube") {
    return `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`;
  }
  return null;
}

function validHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = getUrl(value);
  if (!url || url.protocol !== "https:") return null;
  return url.toString();
}

async function fetchOEmbedThumbnail(info: ParsedChallengeVideo): Promise<string | null> {
  const endpoint =
    info.provider === "youtube"
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(info.canonicalUrl)}&format=json`
      : info.provider === "vimeo"
        ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(info.canonicalUrl)}`
        : `https://fast.wistia.com/oembed?url=${encodeURIComponent(info.canonicalUrl)}`;

  try {
    const res = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: unknown };
    return validHttpsUrl(data.thumbnail_url);
  } catch {
    return null;
  }
}

export async function resolveChallengeVideoUrl(
  raw: string | null | undefined,
): Promise<ResolvedChallengeVideo | null> {
  const parsed = parseChallengeVideoUrl(raw);
  if (!parsed) return null;
  const thumbnailUrl = (await fetchOEmbedThumbnail(parsed)) ?? fallbackThumbnail(parsed);
  return { ...parsed, thumbnailUrl };
}
