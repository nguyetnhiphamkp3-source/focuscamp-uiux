/**
 * API key generation + verification.
 * Plain key format: fc_live_<32 base62 chars>. Stored as sha256 hash.
 * Plain key shown ONCE at creation; verification compares hash with timing-safe equal.
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "fc_live_";
const KEY_BODY_LEN = 32;
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Generate a base62 string of given length using crypto.randomBytes. */
function base62(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function generatePlainKey(): string {
  return KEY_PREFIX + base62(KEY_BODY_LEN);
}

export function hashKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

/** Constant-time compare two hex strings of equal length. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export interface ResolvedApiKey {
  apiKeyId: string;
  communityId: string;
  ownerId: string;
  scopes: string[];
}

/**
 * Resolve a Bearer token to an active ApiKey + community + owner.
 * Returns null on any failure (not found, revoked, expired, hash mismatch).
 */
export async function resolveApiKey(
  bearer: string | null | undefined
): Promise<ResolvedApiKey | null> {
  if (!bearer) return null;
  const plain = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : bearer.trim();
  if (!plain.startsWith(KEY_PREFIX)) return null;
  const hash = hashKey(plain);
  const row = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      communityId: true,
      ownerId: true,
      scopes: true,
      keyHash: true,
      revokedAt: true,
      expiresAt: true,
    },
  });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  // Defensive timing-safe compare (Prisma already matched but keep paranoid)
  if (!timingSafeEqualHex(row.keyHash, hash)) return null;

  // Async update lastUsedAt — do not block
  prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    apiKeyId: row.id,
    communityId: row.communityId,
    ownerId: row.ownerId,
    scopes: row.scopes,
  };
}

export function keyPrefix(plain: string): string {
  // First 8 chars after the namespace, e.g. "fc_live_abc123…"
  return plain.slice(0, KEY_PREFIX.length + 6) + "…";
}
