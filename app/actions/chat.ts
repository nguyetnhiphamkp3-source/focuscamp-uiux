"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { SendMessageSchema } from "@/lib/validations";
import { sendMessage } from "@/lib/services/chat";
import { logError } from "@/lib/logger";

export async function sendMessageAction(formData: FormData) {
  const s = await auth();
  if (!s?.user?.id) return;

  const channelId = formData.get("channelId") as string;
  const communitySlug = formData.get("communitySlug") as string;
  const channelSlug = formData.get("channelSlug") as string;

  if (!channelId || !communitySlug || !channelSlug) return;

  try {
    const { content } = SendMessageSchema.parse({
      content: formData.get("content"),
    });
    await sendMessage({
      channelId,
      userId: s.user.id,
      content,
    });
    revalidatePath(`/c/${communitySlug}/chat/${channelSlug}`);
  } catch (err) {
    logError(err, { channelId, userId: s.user.id });
  }
}
