"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createProduct } from "@/lib/services/marketplace";
import { CreateProductSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function createProductAction(input: {
  communityId: string;
  communitySlug: string;
  slug: string;
  title: string;
  description?: string;
  type?: string;
  pillar?: string;
  priceVnd?: number;
  isFree?: boolean;
  externalUrl?: string;
}): Promise<ActionResult<{ slug: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreateProductSchema.safeParse({
    communityId: input.communityId,
    slug: input.slug,
    title: input.title,
    description: input.description,
    type: input.type,
    pillar: input.pillar,
    priceVnd: input.priceVnd,
    isFree: input.isFree,
    externalUrl: input.externalUrl,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const p = await createProduct({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      type: parsed.data.type,
      pillar: parsed.data.pillar || undefined,
      priceVnd: parsed.data.priceVnd,
      isFree: parsed.data.isFree,
      externalUrl: parsed.data.externalUrl ?? undefined,
    });
    revalidatePath(`/c/${input.communitySlug}/marketplace`);
    return { ok: true, data: { slug: p.slug } };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
