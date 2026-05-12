"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  getFeatureUnreadCountAction,
  markFeatureViewedAction,
} from "@/app/actions/feature-read";
import type { FeatureReadKey } from "@/lib/services/feature-read";

export function FeatureUnreadBadge({
  communityId,
  featureKey,
  href,
}: {
  communityId: string;
  featureKey: FeatureReadKey;
  href: string;
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [, start] = useTransition();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    let cancelled = false;

    start(async () => {
      if (isActive) {
        setCount(0);
        await markFeatureViewedAction({ communityId, featureKey });
        return;
      }

      const res = await getFeatureUnreadCountAction({ communityId, featureKey });
      if (!cancelled && res.ok) setCount(res.data.count);
    });

    return () => {
      cancelled = true;
    };
  }, [communityId, featureKey, isActive, pathname, start]);

  if (count <= 0) return null;

  return <span className="unread-badge">{count > 99 ? "99+" : count}</span>;
}
