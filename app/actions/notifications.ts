"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  markAsRead,
  markAllRead,
  clearRead,
  clearAll,
} from "@/lib/services/notification";
import { logError } from "@/lib/logger";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; reason: string };

const IdSchema = z.object({ notificationId: z.string().cuid() });

export async function markNotificationReadAction(input: {
  notificationId: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    await markAsRead({
      userId: s.user.id,
      notificationId: parsed.data.notificationId,
    });
    revalidatePath("/inbox");
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

export async function markAllReadAction(): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await markAllRead({ userId: s.user.id });
    revalidatePath("/inbox");
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

export async function clearAllNotificationsAction(): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await clearAll({ userId: s.user.id });
    revalidatePath("/inbox");
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

export async function clearReadNotificationsAction(): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await clearRead({ userId: s.user.id });
    revalidatePath("/inbox");
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
