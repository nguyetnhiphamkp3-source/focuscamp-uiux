"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  updatePillarsConfig,
  updateClassesConfig,
  updateCurrencyConfig,
  updateLevelsConfig,
  updateMemberRole,
  removeMember,
  updateUiConfig,
  updateChannelConfig,
} from "@/lib/services/community-settings";
import {
  UpdatePillarsSchema,
  UpdateClassesSchema,
  UpdateCurrencySchema,
  UpdateLevelsSchema,
  UpdateMemberRoleSchema,
  RemoveMemberSchema,
  UpdateUiConfigSchema,
  UpdateChannelConfigSchema,
} from "@/lib/validations";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type {
  PillarConfig,
  ClassConfig,
  GemsConfig,
  LevelTier,
  FeatureKey,
} from "@/lib/community-config";

type ActionResult = { ok: true } | { ok: false; reason: string };

function bump(slug: string) {
  // Single layout-scoped revalidate invalidates every route under /c/[slug]
  // (feed, cot, qa, signals, settings, courses, marketplace, …) in one call.
  revalidatePath(`/c/${slug}`, "layout");
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

export async function updateMemberRoleAction(input: {
  communityId: string;
  communitySlug: string;
  targetUserId: string;
  role: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateMemberRoleSchema.safeParse({
    communityId: input.communityId,
    targetUserId: input.targetUserId,
    role: input.role,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateMemberRole({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      targetUserId: parsed.data.targetUserId,
      role: parsed.data.role,
    });
    bump(input.communitySlug);
    return { ok: true };
  } catch (err) {
    logError(err, {
      userId: s.user.id,
      communityId: input.communityId,
      target: input.targetUserId,
    });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function removeMemberAction(input: {
  communityId: string;
  communitySlug: string;
  targetUserId: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = RemoveMemberSchema.safeParse({
    communityId: input.communityId,
    targetUserId: input.targetUserId,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await removeMember({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      targetUserId: parsed.data.targetUserId,
    });
    bump(input.communitySlug);
    return { ok: true };
  } catch (err) {
    logError(err, {
      userId: s.user.id,
      communityId: input.communityId,
      target: input.targetUserId,
    });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateChannelConfigAction(input: {
  communityId: string;
  communitySlug: string;
  discord: Array<{ webhookUrl: string; eventTypes: string[]; challengeIds?: string[] }> | null;
  telegram: Array<{
    id?: string;
    botToken?: string;
    chatId: string;
    topicId?: string;
    eventTypes: string[];
    challengeIds?: string[];
  }> | null;
  templates?: Record<string, { title?: string; description?: string }>;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateChannelConfigSchema.safeParse({
    communityId: input.communityId,
    discord: input.discord,
    telegram: input.telegram,
    templates: input.templates,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateChannelConfig({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      discord: parsed.data.discord,
      telegram: parsed.data.telegram,
      templates: parsed.data.templates,
    });
    bump(input.communitySlug);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateUiConfigAction(input: {
  communityId: string;
  communitySlug: string;
  hiddenFeatures: FeatureKey[];
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateUiConfigSchema.safeParse({
    communityId: input.communityId,
    hiddenFeatures: input.hiddenFeatures,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateUiConfig({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      hiddenFeatures: parsed.data.hiddenFeatures,
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

export async function deleteCommunityAction(input: {
  communityId: string;
  communitySlug: string;
  confirmSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  if (input.confirmSlug !== input.communitySlug)
    return { ok: false, reason: "Slug không khớp" };

  try {
    const community = await prisma.community.findUnique({
      where: { id: input.communityId },
      select: { ownerId: true },
    });
    if (!community) return { ok: false, reason: "Cộng đồng không tồn tại" };
    if (community.ownerId !== s.user.id)
      return { ok: false, reason: "Chỉ chủ cộng đồng mới xoá được" };

    await prisma.community.delete({ where: { id: input.communityId } });
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
