/**
 * Parser for Challenge.benefits JSON column → typed array.
 * Empty / malformed input returns null so render can fall back to derived defaults.
 *
 * Shape on disk: Array<{ icon?: string, text: string }>, max 6 items.
 * Write path validates with ChallengeBenefitsSchema in lib/validations.ts.
 */

export type ChallengeBenefit = { icon?: string; text: string };

export function parseChallengeBenefits(raw: unknown): ChallengeBenefit[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items: ChallengeBenefit[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    if (typeof o.text !== "string") continue;
    const text = o.text.trim();
    if (!text) continue;
    const icon = typeof o.icon === "string" && o.icon.trim() ? o.icon.trim() : undefined;
    items.push(icon ? { icon, text } : { text });
  }
  return items.length > 0 ? items : null;
}
