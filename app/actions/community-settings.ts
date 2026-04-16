"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  updatePillarsConfig,
  updateClassesConfig,
  updateCurrencyConfig,
  updateLevelsConfig,
} from "@/lib/services/community-settings";
import {
  UpdatePillarsSchema,
  UpdateClassesSchema,
  UpdateCurrencySchema,
  UpdateLevelsSchema,
} from "@/lib/validations";
import { logError } from "@/lib/logger";
import type {
  PillarConfig,
  ClassConfig,
  GemsConfig,
  LevelTier,
} from "@/lib/community-config";

type ActionResult = { ok: true } | { ok: false; reason: string };

function bump(slug: string) {
  // Any page that reads community config should revalidate.
  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/feed`);
  revalidatePath(`/c/${slug}/cot`);
  revalidatePath(`/c/${slug}/qa`);
  revalidatePath(`/c/${slug}/signals`);
  revalidatePath(`/c/${slug}/settings`);
}

export async function updatePillarsAction(input: {
  communityId: string;
  communitySlug: string;
  pillars: PillarConfig[];
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdatePillarsSchema.safeParse({
    communityId: input.communityId,
    pillars: input.pillars,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updatePillarsConfig({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      // Drop empty-string optionals introduced by Zod .or(z.literal(""))
      pillars: parsed.data.pillars.map((p) => ({
        key: p.key,
        label: p.label,
        emoji: p.emoji || undefined,
        cssClass: p.cssClass || undefined,
        color: p.color || undefined,
      })),
    });
    bump(input.communitySlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateClassesAction(input: {
  communityId: string;
  communitySlug: string;
  classes: ClassConfig[];
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateClassesSchema.safeParse({
    communityId: input.communityId,
    classes: input.classes,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateClassesConfig({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      classes: parsed.data.classes.map((c) => ({
        key: c.key,
        label: c.label,
        emoji: c.emoji || undefined,
        description: c.description || undefined,
        color: c.color || undefined,
      })),
    });
    bump(input.communitySlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateCurrencyAction(input: {
  communityId: string;
  communitySlug: string;
  currency: GemsConfig;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateCurrencySchema.safeParse({
    communityId: input.communityId,
    currencyName: input.currency.currencyName,
    currencyIcon: input.currency.currencyIcon,
    gemsName: input.currency.gemsName,
    gemsIcon: input.currency.gemsIcon,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateCurrencyConfig({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      currency: {
        currencyName: parsed.data.currencyName,
        currencyIcon: parsed.data.currencyIcon,
        gemsName: parsed.data.gemsName || undefined,
        gemsIcon: parsed.data.gemsIcon || undefined,
      },
    });
    bump(input.communitySlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateLevelsAction(input: {
  communityId: string;
  communitySlug: string;
  tiers: LevelTier[];
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateLevelsSchema.safeParse({
    communityId: input.communityId,
    tiers: input.tiers,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateLevelsConfig({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      tiers: parsed.data.tiers.map((t) => ({
        minLevel: t.minLevel,
        name: t.name,
        emoji: t.emoji || undefined,
        color: t.color || undefined,
      })),
    });
    bump(input.communitySlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
