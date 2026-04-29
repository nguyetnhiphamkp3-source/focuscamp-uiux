"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generatePlainKey, hashKey, keyPrefix } from "@/lib/api-keys";
import { CreateApiKeySchema, RevokeApiKeySchema } from "@/lib/validations";
import { logError, logger } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

async function assertOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== userId) throw new Error("Chỉ chủ cộng đồng mới quản lý API key");
}

export async function createApiKeyAction(input: {
  communityId: string;
  communitySlug: string;
  name: string;
  expiresInDays?: number | null;
}): Promise<ActionResult<{ plain: string; id: string; prefix: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreateApiKeySchema.safeParse({
    communityId: input.communityId,
    name: input.name,
    expiresInDays: input.expiresInDays ?? null,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await assertOwner(s.user.id, parsed.data.communityId);
    const plain = generatePlainKey();
    const hash = hashKey(plain);
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    const row = await prisma.apiKey.create({
      data: {
        communityId: parsed.data.communityId,
        ownerId: s.user.id,
        name: parsed.data.name,
        keyHash: hash,
        keyPrefix: keyPrefix(plain),
        expiresAt,
      },
      select: { id: true, keyPrefix: true },
    });
    logger.info(
      { apiKeyId: row.id, communityId: parsed.data.communityId, by: s.user.id },
      "[apikey] created"
    );
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return { ok: true, data: { plain, id: row.id, prefix: row.keyPrefix } };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function revokeApiKeyAction(input: {
  communityId: string;
  communitySlug: string;
  apiKeyId: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = RevokeApiKeySchema.safeParse({
    communityId: input.communityId,
    apiKeyId: input.apiKeyId,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await assertOwner(s.user.id, parsed.data.communityId);
    const updated = await prisma.apiKey.updateMany({
      where: {
        id: parsed.data.apiKeyId,
        communityId: parsed.data.communityId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (updated.count === 0) return { ok: false, reason: "not_found_or_revoked" };
    revalidatePath(`/c/${input.communitySlug}/settings`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function listApiKeys(communityId: string, ownerId: string) {
  return prisma.apiKey.findMany({
    where: { communityId, ownerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}
