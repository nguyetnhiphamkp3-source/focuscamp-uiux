/**
 * Pair-code linking flow for connecting a focus.camp user to a Telegram chat.
 *
 * 1. User clicks "Link Telegram" in settings → server generates 6-digit code with 15-min expiry
 * 2. User opens @focus_camp_bot in Telegram, sends `/start <code>`
 * 3. Webhook validates code → sets User.telegramUserId
 *
 * Code is single-use, expires fast.
 */
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const CODE_TTL_MIN = 15;

function genCode(): string {
  // 6-digit numeric, easy to type in Telegram
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

export async function createPairCode(userId: string): Promise<string> {
  // Invalidate old codes for this user
  await prisma.telegramLinkCode.deleteMany({ where: { userId } });
  let code = genCode();
  // Collision-safe (extremely unlikely given 1M space)
  while (await prisma.telegramLinkCode.findUnique({ where: { code } })) {
    code = genCode();
  }
  await prisma.telegramLinkCode.create({
    data: {
      code,
      userId,
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
    },
  });
  return code;
}

export async function redeemPairCode(input: {
  code: string;
  telegramUserId: string;
  telegramUsername?: string;
}): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const row = await prisma.telegramLinkCode.findUnique({
    where: { code: input.code },
  });
  if (!row) return { ok: false, reason: "code_not_found" };
  if (row.expiresAt < new Date()) {
    await prisma.telegramLinkCode.delete({ where: { id: row.id } }).catch(() => {});
    return { ok: false, reason: "code_expired" };
  }

  // Block if this Telegram account is already linked to a DIFFERENT user
  const existing = await prisma.user.findUnique({
    where: { telegramUserId: input.telegramUserId },
    select: { id: true },
  });
  if (existing && existing.id !== row.userId) {
    return { ok: false, reason: "telegram_already_linked_to_another_account" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        telegramUserId: input.telegramUserId,
        telegramUsername: input.telegramUsername ?? null,
      },
    }),
    prisma.telegramLinkCode.delete({ where: { id: row.id } }),
  ]);
  logger.info(
    { userId: row.userId, telegramUserId: input.telegramUserId },
    "[telegram-link] linked"
  );
  return { ok: true, userId: row.userId };
}

export async function unlinkTelegram(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { telegramUserId: null, telegramUsername: null },
  });
  logger.info({ userId }, "[telegram-link] unlinked");
}

export async function findUserByTelegramId(telegramUserId: string) {
  return prisma.user.findUnique({
    where: { telegramUserId },
    select: {
      id: true,
      name: true,
      email: true,
      telegramUsername: true,
      defaultCommunityId: true,
    },
  });
}
