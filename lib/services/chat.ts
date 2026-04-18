/**
 * Chat service — message sending and channel operations.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Create a new message in a channel.
 */
export async function sendMessage(input: {
  channelId: string;
  userId: string;
  content: string;
}) {
  const message = await prisma.message.create({
    data: {
      channelId: input.channelId,
      userId: input.userId,
      content: input.content,
    },
  });
  logger.info(
    { channelId: input.channelId, userId: input.userId, messageId: message.id },
    "[chat] message sent"
  );
  return message;
}
