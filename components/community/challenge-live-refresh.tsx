"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible client component for the challenge detail page. Listens for
 * `fc:notification` window events (re-broadcast by the notification bell's single
 * SSE connection — no new connection opened here) and refreshes the page when
 * THIS user's submission in THIS challenge is approved/rejected, so the submitter
 * sees the new status live without a manual reload.
 */
export function ChallengeLiveRefresh({ challengeSlug }: { challengeSlug: string }) {
  const router = useRouter();

  useEffect(() => {
    const onNotif = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { type?: string; link?: string | null }
        | undefined;
      if (!detail) return;
      if (
        detail.type !== "SUBMISSION_APPROVED" &&
        detail.type !== "SUBMISSION_REJECTED"
      ) {
        return;
      }
      // Only refresh when the decision concerns the challenge being viewed.
      if (detail.link && !detail.link.includes(`/challenges/${challengeSlug}`)) {
        return;
      }
      router.refresh();
    };
    window.addEventListener("fc:notification", onNotif);
    return () => window.removeEventListener("fc:notification", onNotif);
  }, [challengeSlug, router]);

  return null;
}
