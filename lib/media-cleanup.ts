import { deleteFile, keyFromPublicUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

export async function deleteStoredMediaUrl(
  url: string | null | undefined,
  context: Record<string, unknown> = {},
): Promise<void> {
  if (!url) return;

  const key = keyFromPublicUrl(url);
  if (!key) return;

  const deleted = await deleteFile(key);
  if (!deleted) {
    logger.warn({ ...context, key }, "[media] cleanup skipped or failed");
  }
}

export async function deleteReplacedMediaUrl(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined,
  context: Record<string, unknown> = {},
): Promise<void> {
  if (!oldUrl || oldUrl === newUrl) return;
  await deleteStoredMediaUrl(oldUrl, context);
}

/**
 * Delete any media URLs present in `oldUrls` but absent from `newUrls`.
 * Used when an edit replaces a multi-image set (e.g. checkin resubmit).
 */
export async function deleteRemovedMediaUrls(
  oldUrls: string[] | null | undefined,
  newUrls: string[] | null | undefined,
  context: Record<string, unknown> = {},
): Promise<void> {
  if (!oldUrls?.length) return;
  const keep = new Set(newUrls ?? []);
  for (const url of oldUrls) {
    if (!keep.has(url)) await deleteStoredMediaUrl(url, context);
  }
}
