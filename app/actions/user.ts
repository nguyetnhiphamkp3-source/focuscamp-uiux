"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { updateOwnProfile } from "@/lib/services/user";
import { UpdateProfileSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

type ActionResult =
  | { ok: true; profilePath: string }
  | { ok: false; reason: string };

export async function updateProfileAction(input: {
  name?: string;
  bio?: string;
  location?: string;
  handle?: string;
  image?: string;
  /** Community slug to revalidate the profile page under */
  communitySlug?: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateProfileSchema.safeParse({
    name: input.name,
    bio: input.bio,
    location: input.location,
    handle: input.handle,
    image: input.image,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const updated = await updateOwnProfile({
      userId: s.user.id,
      name: parsed.data.name || undefined,
      bio: parsed.data.bio || undefined,
      location: parsed.data.location || undefined,
      handle: parsed.data.handle || undefined,
      image: input.image,
    });
    if (input.communitySlug) {
      revalidatePath(`/c/${input.communitySlug}/profile`);
      revalidatePath(`/c/${input.communitySlug}/profile/${s.user.id}`);
    }
    const profileKey = encodeURIComponent(updated.handle ?? updated.id);
    revalidatePath(`/u/${profileKey}`);
    return { ok: true, profilePath: `/u/${profileKey}` };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
