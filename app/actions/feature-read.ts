"use server";

import { auth } from "@/auth";
import {
  getFeatureUnreadCount,
  isFeatureReadKey,
  markFeatureViewed,
} from "@/lib/services/feature-read";
import { logError } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; reason: string };

export async function getFeatureUnreadCountAction(input: {
  communityId: string;
  featureKey: string;
}): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };
  if (!isFeatureReadKey(input.featureKey)) {
    return { ok: false, reason: "invalid_feature" };
  }

  try {
    const count = await getFeatureUnreadCount({
      userId: session.user.id,
      communityId: input.communityId,
      featureKey: input.featureKey,
    });
    return { ok: true, data: { count } };
  } catch (err) {
    logError(err, {
      userId: session.user.id,
      communityId: input.communityId,
      featureKey: input.featureKey,
    });
    return { ok: false, reason: "unknown" };
  }
}

export async function markFeatureViewedAction(input: {
  communityId: string;
  featureKey: string;
}): Promise<ActionResult<{ ok: true }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };
  if (!isFeatureReadKey(input.featureKey)) {
    return { ok: false, reason: "invalid_feature" };
  }

  try {
    await markFeatureViewed({
      userId: session.user.id,
      communityId: input.communityId,
      featureKey: input.featureKey,
    });
    return { ok: true, data: { ok: true } };
  } catch (err) {
    logError(err, {
      userId: session.user.id,
      communityId: input.communityId,
      featureKey: input.featureKey,
    });
    return { ok: false, reason: "unknown" };
  }
}
