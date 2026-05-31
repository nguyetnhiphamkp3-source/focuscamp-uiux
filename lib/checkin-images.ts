/**
 * Checkin evidence images — normalize the (new) `imageUrls` array against the
 * (deprecated) single `imageUrl` column so every read site gets a clean string[].
 *
 * Rows written before multi-image support have `imageUrl` set and `imageUrls`
 * empty; new rows write `imageUrls` and leave `imageUrl` null. This helper hides
 * that split so callers never branch on it.
 */

/** Max evidence images a member may attach to a single check-in. */
export const MAX_CHECKIN_IMAGES = 3;

export function checkinImages(checkin: {
  imageUrls?: string[] | null;
  imageUrl?: string | null;
}): string[] {
  if (checkin.imageUrls && checkin.imageUrls.length > 0) return checkin.imageUrls;
  if (checkin.imageUrl) return [checkin.imageUrl];
  return [];
}
