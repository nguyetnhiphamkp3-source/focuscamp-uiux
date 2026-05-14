"use server";

import { auth, signIn } from "@/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  joinCommunity,
  createCommunity,
  updateCommunityInfo,
  renewCommunityPlan,
} from "@/lib/services/community";
import { startTierSubscription } from "@/lib/services/subscription";
import {
  JoinCommunitySchema,
  CreateCommunitySchema,
  UpdateCommunityInfoSchema,
  RenewCommunityPlanSchema,
} from "@/lib/validations";
import type { PlanTier } from "@/lib/platform-plans";
import { logError } from "@/lib/logger";

type ActionResult = { ok: true } | { ok: false; reason: string };

/**
 * Join a community. If user isn't logged in, redirects to Google SSO
 * with redirect back to the community page.
 */
export async function joinCommunityAction(input: {
  communityId: string;
  communitySlug: string;
  className?: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) {
    await signIn("google", { redirectTo: `/c/${input.communitySlug}` });
    // signIn throws a redirect, so this return is unreachable but TS needs it
    return { ok: false, reason: "unauthorized" };
  }

  const parsed = JoinCommunitySchema.safeParse({
    communityId: input.communityId,
    className: input.className,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await joinCommunity(
      s.user.id,
      parsed.data.communityId,
      parsed.data.className || undefined
    );
    revalidatePath(`/c/${input.communitySlug}`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function createCommunityAction(input: {
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  category?: string | null;
  planTier: PlanTier;
}): Promise<
  | { ok: true; slug: string; paymentCode: string }
  | { ok: false; reason: string }
> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreateCommunitySchema.safeParse({
    name: input.name,
    slug: input.slug,
    tagline: input.tagline,
    description: input.description,
    category: input.category,
    planTier: input.planTier,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const { community, paymentCode } = await createCommunity({
      userId: s.user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      tagline: parsed.data.tagline || undefined,
      description: parsed.data.description || undefined,
      category: parsed.data.category || undefined,
      planTier: parsed.data.planTier,
    });
    revalidatePath("/discovery");
    revalidatePath("/");
    return { ok: true, slug: community.slug, paymentCode };
  } catch (err) {
    logError(err, { userId: s.user.id, slug: input.slug });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function renewCommunityPlanAction(input: {
  communityId: string;
}): Promise<
  | { ok: true; paymentCode: string; slug: string }
  | { ok: false; reason: string }
> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = RenewCommunityPlanSchema.safeParse({
    communityId: input.communityId,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const res = await renewCommunityPlan({
      userId: s.user.id,
      communityId: parsed.data.communityId,
    });
    return { ok: true, paymentCode: res.paymentCode, slug: res.slug };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function subscribeCommunityTierAction(input: {
  communityId: string;
  communitySlug: string;
  tierKey: string;
  priceVnd: number;
  durationDays: number;
}): Promise<{ ok: true; paymentCode: string } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  try {
    const { paymentCode } = await startTierSubscription({
      userId: s.user.id,
      communityId: input.communityId,
      tierKey: input.tierKey,
      priceVnd: input.priceVnd,
      durationDays: input.durationDays,
    });
    revalidatePath(`/c/${input.communitySlug}`);
    return { ok: true, paymentCode };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateTiersConfigAction(input: {
  communityId: string;
  communitySlug: string;
  tiersConfig: unknown;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
  });
  if (!community || community.ownerId !== s.user.id)
    return { ok: false, reason: "forbidden" };

  const { getTiersConfig } = await import("@/lib/services/subscription");
  const parsed = getTiersConfig(input.tiersConfig);
  if (parsed.length === 0) return { ok: false, reason: "invalid_tiers" };

  try {
    await prisma.community.update({
      where: { id: input.communityId },
      data: { tiersConfig: input.tiersConfig as Prisma.InputJsonValue },
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateCommunityInfoAction(input: {
  communityId: string;
  communitySlug: string;
  name?: string;
  tagline?: string;
  description?: string;
  category?: string | null;
  featuredOnGlobal?: boolean;
  bannerUrl?: string;
  iconUrl?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateCommunityInfoSchema.safeParse({
    communityId: input.communityId,
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    category: input.category,
    featuredOnGlobal: input.featuredOnGlobal,
    bannerUrl: input.bannerUrl,
    iconUrl: input.iconUrl,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateCommunityInfo({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      name: parsed.data.name,
      tagline: parsed.data.tagline ?? undefined,
      description: parsed.data.description ?? undefined,
      category: parsed.data.category ?? undefined,
      featuredOnGlobal: parsed.data.featuredOnGlobal,
      bannerUrl: parsed.data.bannerUrl ?? undefined,
      iconUrl: parsed.data.iconUrl ?? undefined,
    });
    revalidatePath(`/c/${input.communitySlug}`);
    revalidatePath(`/c/${input.communitySlug}/settings`);
    revalidatePath("/discovery");
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
