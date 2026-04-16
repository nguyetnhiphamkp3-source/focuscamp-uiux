/**
 * Community-level concept configuration.
 *
 * Every community owns its own taxonomy — pillars, classes, currency name,
 * level tiers. Stored as JSON on the Community row (`pillarsConfig`,
 * `classesConfig`, `gemsConfig`, etc.) so owners can configure without a
 * schema migration.
 *
 * Always read via the helpers in this file. NEVER touch `community.pillarsConfig`
 * directly — the JSON shape is validated here and safe fallbacks are applied.
 */
import { z } from "zod";
import { logger } from "@/lib/logger";

/* ===== Types ===== */

export const PillarConfigSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
  /** Optional CSS class name to style the tag background (e.g. "pillar-offer"). */
  cssClass: z.string().max(60).optional(),
  /** Optional brand color (hex or CSS value). */
  color: z.string().max(40).optional(),
});
export type PillarConfig = z.infer<typeof PillarConfigSchema>;

export const ClassConfigSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(40).optional(),
});
export type ClassConfig = z.infer<typeof ClassConfigSchema>;

export const GemsConfigSchema = z.object({
  /** Primary currency display name (e.g. "AIP", "Points", "Crystals"). */
  currencyName: z.string().min(1).max(30),
  /** Emoji or short icon string (e.g. "💰"). */
  currencyIcon: z.string().max(8),
  /** Secondary/soft currency name. */
  gemsName: z.string().max(30).optional(),
  gemsIcon: z.string().max(8).optional(),
});
export type GemsConfig = z.infer<typeof GemsConfigSchema>;

export const LevelTierSchema = z.object({
  /** Minimum level required for this tier. */
  minLevel: z.number().int().nonnegative(),
  name: z.string().min(1).max(40),
  emoji: z.string().max(8).optional(),
  color: z.string().max(40).optional(),
});
export type LevelTier = z.infer<typeof LevelTierSchema>;

/** Shape of the fields we read off a Community row. */
export type CommunityConfigSource = {
  pillarsConfig?: unknown;
  classesConfig?: unknown;
  gemsConfig?: unknown;
  levelsConfig?: unknown;
};

/* ===== Defaults (when community has no config set) ===== */

export const DEFAULT_GEMS: GemsConfig = {
  currencyName: "Point",
  currencyIcon: "💎",
};

/* ===== Safe readers ===== */

function parseArray<T>(raw: unknown, item: z.ZodType<T>, ctx: string): T[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    logger.warn({ ctx, raw }, "[community-config] expected array, got other");
    return [];
  }
  const out: T[] = [];
  for (const entry of raw) {
    const parsed = item.safeParse(entry);
    if (parsed.success) out.push(parsed.data);
    else logger.warn({ ctx, issues: parsed.error.issues }, "[community-config] bad entry");
  }
  return out;
}

/** Pillars of a community — empty array if not configured. */
export function getPillars(c: CommunityConfigSource): PillarConfig[] {
  return parseArray(c.pillarsConfig, PillarConfigSchema, "pillars");
}

/** Classes of a community — empty array if not configured. */
export function getClasses(c: CommunityConfigSource): ClassConfig[] {
  return parseArray(c.classesConfig, ClassConfigSchema, "classes");
}

/** Level tiers (ordered ascending by minLevel). Empty if not configured. */
export function getLevelTiers(c: CommunityConfigSource): LevelTier[] {
  const tiers = parseArray(c.levelsConfig, LevelTierSchema, "levels");
  return tiers.slice().sort((a, b) => a.minLevel - b.minLevel);
}

/** Currency config — falls back to { Point, 💎 } when not set. */
export function getCurrency(c: CommunityConfigSource): GemsConfig {
  if (c.gemsConfig === null || c.gemsConfig === undefined) return DEFAULT_GEMS;
  const parsed = GemsConfigSchema.safeParse(c.gemsConfig);
  if (parsed.success) return parsed.data;
  logger.warn({ issues: parsed.error.issues }, "[community-config] bad gemsConfig, using default");
  return DEFAULT_GEMS;
}

/** Find a pillar by key inside the given pillars list. */
export function pillarByKey(
  key: string | null | undefined,
  pillars: PillarConfig[]
): PillarConfig | null {
  if (!key) return null;
  return pillars.find((p) => p.key === key) ?? null;
}

/** Find a class by key inside the given classes list. */
export function classByKey(
  key: string | null | undefined,
  classes: ClassConfig[]
): ClassConfig | null {
  if (!key) return null;
  return classes.find((c) => c.key === key) ?? null;
}

/** Given level, return the current tier (highest tier whose minLevel ≤ level). */
export function tierForLevel(level: number, tiers: LevelTier[]): LevelTier | null {
  let current: LevelTier | null = null;
  for (const t of tiers) {
    if (level >= t.minLevel) current = t;
    else break;
  }
  return current;
}
