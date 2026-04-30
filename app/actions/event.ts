"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createEvent, bookEvent } from "@/lib/services/event";
import { logError } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function createEventAction(input: {
  communityId: string;
  communitySlug: string;
  type: "ONE_ON_ONE" | "GROUP_LIVE" | "WORKSHOP";
  title: string;
  description?: string;
  startsAt: string; // ISO
  durationMin: number;
  capacity: number;
  priceVnd?: number;
  meetingUrl?: string;
  bannerUrl?: string;
}): Promise<ActionResult<{ eventId: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  if (!input.title.trim() || !input.startsAt) {
    return { ok: false, reason: "missing_fields" };
  }
  try {
    const ev = await createEvent({
      userId: s.user.id,
      communityId: input.communityId,
      type: input.type,
      title: input.title.trim(),
      description: input.description,
      startsAt: new Date(input.startsAt),
      durationMin: input.durationMin || 60,
      capacity: Math.max(1, input.capacity || 1),
      priceVnd: input.priceVnd,
      meetingUrl: input.meetingUrl,
      bannerUrl: input.bannerUrl,
    });
    revalidatePath(`/c/${input.communitySlug}/events`);
    return { ok: true, data: { eventId: ev.id } };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function bookEventAction(input: {
  eventId: string;
  communitySlug: string;
}): Promise<
  | { ok: true; status: "CONFIRMED" }
  | { ok: true; status: "PENDING_PAYMENT"; paymentCode: string }
  | { ok: false; reason: string }
> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    const res = await bookEvent({ userId: s.user.id, eventId: input.eventId });
    revalidatePath(`/c/${input.communitySlug}/events`);
    return { ok: true, ...res };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
