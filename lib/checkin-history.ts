/**
 * Rejection-history snapshots for check-in resubmissions.
 *
 * Each time a member resubmits a rejected check-in, `resubmitCheckin` snapshots
 * the rejected attempt into `Checkin.reviewHistory` (a JSON array) before the row
 * is overwritten. This module defines the snapshot shape and a defensive parser
 * so read sites get a clean, typed list.
 */

import type { AIReviewData } from "@/lib/ai-review-data";

export type CheckinHistoryEntry = {
  content: string;
  linkUrl: string | null;
  imageUrls: string[];
  reviewNote: string | null;
  aiReviewData: AIReviewData | null;
  /** ISO string — when stored image evidence was pruned by retention cleanup. */
  imageUrlsPrunedAt: string | null;
  /** ISO string — when the original review happened (may be null for legacy rows). */
  reviewedAt: string | null;
  /** ISO string — when this attempt was rejected. */
  rejectedAt: string;
  /** 1 = first rejection, 2 = second, … */
  attempt: number;
};

/** Defensively parse the `reviewHistory` JSON column into a typed list. */
export function parseCheckinHistory(raw: unknown): CheckinHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const e = item as Record<string, unknown>;
    return [
      {
        content: typeof e.content === "string" ? e.content : "",
        linkUrl: typeof e.linkUrl === "string" ? e.linkUrl : null,
        imageUrls: Array.isArray(e.imageUrls)
          ? e.imageUrls.filter((u): u is string => typeof u === "string")
          : [],
        reviewNote: typeof e.reviewNote === "string" ? e.reviewNote : null,
        aiReviewData:
          e.aiReviewData && typeof e.aiReviewData === "object"
            ? (e.aiReviewData as AIReviewData)
            : null,
        imageUrlsPrunedAt:
          typeof e.imageUrlsPrunedAt === "string" ? e.imageUrlsPrunedAt : null,
        reviewedAt: typeof e.reviewedAt === "string" ? e.reviewedAt : null,
        rejectedAt:
          typeof e.rejectedAt === "string"
            ? e.rejectedAt
            : typeof e.reviewedAt === "string"
              ? e.reviewedAt
              : "",
        attempt: typeof e.attempt === "number" ? e.attempt : 0,
      },
    ];
  });
}
