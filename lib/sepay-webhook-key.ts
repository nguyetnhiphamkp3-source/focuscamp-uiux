import { createHash, randomBytes } from "crypto";

export function generateSepayWebhookKey(): string {
  return `sk_${randomBytes(24).toString("hex")}`;
}

export function hashSepayWebhookKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function maskSepayWebhookKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  const last4 = trimmed.slice(-4);
  if (trimmed.startsWith("sk_")) return `sk_${"*".repeat(36)}${last4}`;
  const prefix = trimmed.slice(0, Math.min(3, trimmed.length));
  return `${prefix}${"*".repeat(36)}${last4}`;
}
