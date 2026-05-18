"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { setSystemPrompt, setAgentApiKey } from "@/lib/services/agent";
import { logError } from "@/lib/logger";

type ActionResult = { ok: true } | { ok: false; reason: string };

export async function updateAgentSystemPromptAction(input: {
  communityId: string;
  communitySlug: string;
  prompt: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await setSystemPrompt({
      userId: s.user.id,
      communityId: input.communityId,
      prompt: input.prompt,
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    revalidatePath(`/c/${input.communitySlug}/agent`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateAgentApiKeyAction(input: {
  communityId: string;
  communitySlug: string;
  apiKey: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await setAgentApiKey({
      userId: s.user.id,
      communityId: input.communityId,
      apiKey: input.apiKey,
    });
    revalidatePath(`/c/${input.communitySlug}/settings`);
    revalidatePath(`/c/${input.communitySlug}/agent`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
