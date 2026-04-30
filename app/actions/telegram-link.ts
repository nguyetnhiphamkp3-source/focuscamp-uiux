"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createPairCode, unlinkTelegram } from "@/lib/services/telegram-link";
import { logError } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function generateTelegramPairCodeAction(): Promise<
  ActionResult<{ code: string; botUsername: string }>
> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    const code = await createPairCode(s.user.id);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "focus_camp_bot";
    return { ok: true, data: { code, botUsername } };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function unlinkTelegramAction(): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await unlinkTelegram(s.user.id);
    revalidatePath("/settings/integrations");
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
