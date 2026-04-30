/**
 * AES-GCM encryption for storing third-party tokens (Telegram bot token etc.)
 * at rest. Uses INTEGRATION_SECRET_KEY env var (32-byte hex). If not set,
 * falls back to plaintext (dev mode only — log warning).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { logger } from "@/lib/logger";

const KEY_HEX = process.env.INTEGRATION_SECRET_KEY;
const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  if (!KEY_HEX || KEY_HEX.length !== 64) return null;
  try {
    return Buffer.from(KEY_HEX, "hex");
  } catch {
    return null;
  }
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const key = getKey();
  if (!key) {
    logger.warn(
      {},
      "[encryption] INTEGRATION_SECRET_KEY missing — storing plaintext (dev only)"
    );
    return `plain:${plain}`;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(stored: string): string | null {
  if (!stored) return null;
  if (stored.startsWith("plain:")) return stored.slice(6);
  if (!stored.startsWith("gcm:")) return null;
  const key = getKey();
  if (!key) return null;
  try {
    const [, ivHex, tagHex, dataHex] = stored.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch (err) {
    logger.error({ err }, "[encryption] decrypt failed");
    return null;
  }
}
