/**
 * License key generation for Software products.
 * Template format: any string with `{XXXX}` placeholders that get filled with
 * cryptographically random base62 chars. Default if no template: "FC-XXXX-XXXX".
 */
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"; // ambiguity-free base54

function randomBlock(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function generateLicenseKey(template: string | null | undefined): string {
  const tpl = template?.trim() || "FC-{XXXX}-{XXXX}";
  return tpl.replace(/\{X+\}/g, (m) => {
    const n = m.length - 2; // strip braces
    return randomBlock(n);
  });
}

/**
 * Idempotent: assigns a key to a Purchase if it doesn't already have one
 * AND the product is LICENSE type.
 */
export async function assignLicenseKey(purchaseId: string): Promise<string | null> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      id: true,
      licenseKey: true,
      product: {
        select: { id: true, type: true, licenseKeyTemplate: true, title: true },
      },
      user: { select: { email: true, name: true } },
    },
  });
  if (!purchase) return null;
  if (purchase.product.type !== "LICENSE") return null;
  if (purchase.licenseKey) return purchase.licenseKey;

  const key = generateLicenseKey(purchase.product.licenseKeyTemplate);
  await prisma.purchase.update({
    where: { id: purchaseId },
    data: { licenseKey: key },
  });
  logger.info(
    { purchaseId, productId: purchase.product.id },
    "[license] key assigned"
  );

  // Best-effort email
  if (purchase.user.email) {
    try {
      const { sendEmail } = await import("@/lib/email");
      const { licenseKeyEmail } = await import("@/lib/email-templates");
      await sendEmail({
        to: purchase.user.email,
        ...licenseKeyEmail({
          key,
          productName: purchase.product.title,
        }),
      });
    } catch (err) {
      logger.warn({ err, purchaseId }, "[license] email failed");
    }
  }

  return key;
}
