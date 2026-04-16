"use server";

import { auth, signIn } from "@/auth";
import { revalidatePath } from "next/cache";
import { joinCommunity, createCommunity } from "@/lib/services/community";
import {
  JoinCommunitySchema,
  CreateCommunitySchema,
} from "@/lib/validations";
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
}): Promise<
  | { ok: true; slug: string }
  | { ok: false; reason: string }
> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreateCommunitySchema.safeParse({
    name: input.name,
    slug: input.slug,
    tagline: input.tagline,
    description: input.description,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const c = await createCommunity({
      userId: s.user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      tagline: parsed.data.tagline || undefined,
      description: parsed.data.description || undefined,
    });
    revalidatePath("/discovery");
    revalidatePath("/");
    return { ok: true, slug: c.slug };
  } catch (err) {
    logError(err, { userId: s.user.id, slug: input.slug });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
