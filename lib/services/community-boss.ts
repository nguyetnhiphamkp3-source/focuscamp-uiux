/**
 * Community Boss — gamification layer.
 *
 * Each community has a "boss" that members damage collectively by doing
 * tasks (check-ins, posts, comments). It's purely visual/motivational —
 * member level still comes from XP on their Membership. The boss is the
 * shared health bar that makes "tôi làm việc = boss bớt máu" tangible.
 *
 * When current HP reaches 0, the community owner (or platform admin) can
 * "respawn" a harder boss via Settings.
 */
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const BossConfigSchema = z.object({
  name: z.string().min(1).max(40),
  tagline: z.string().max(120).optional(),
  maxHp: z.number().int().positive(),
  /** ISO string — HP counts activity AFTER this moment. */
  spawnedAt: z.string().optional(),
  dmgPerCheckin: z.number().int().nonnegative().default(2),
  dmgPerPost: z.number().int().nonnegative().default(3),
  dmgPerComment: z.number().int().nonnegative().default(1),
});

export type BossConfig = z.infer<typeof BossConfigSchema>;

export const DEFAULT_BOSS: BossConfig = {
  name: "Boss Sói",
  tagline: "Kẻ gác cổng đầu tiên",
  maxHp: 100,
  dmgPerCheckin: 2,
  dmgPerPost: 3,
  dmgPerComment: 1,
};

export function getBossConfig(raw: unknown): BossConfig {
  if (raw === null || raw === undefined) return DEFAULT_BOSS;
  const parsed = BossConfigSchema.safeParse(raw);
  if (parsed.success) return { ...DEFAULT_BOSS, ...parsed.data };
  return DEFAULT_BOSS;
}

export type BossState = BossConfig & {
  currentHp: number;
  hpPct: number; // 0..1
  defeated: boolean;
  activitySince: Date | null;
};

/**
 * Compute live boss state for a community. Counts community-wide check-ins
 * + posts + comments since `spawnedAt` (or since epoch if boss has never
 * been configured) and subtracts damage from maxHp.
 */
export async function computeBossState(communityId: string): Promise<BossState> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { bossConfig: true, createdAt: true },
  });
  const cfg = getBossConfig(community?.bossConfig);
  const since = cfg.spawnedAt ? new Date(cfg.spawnedAt) : community?.createdAt ?? new Date(0);

  const [checkins, posts, comments] = await Promise.all([
    prisma.checkin.count({
      where: {
        challenge: { communityId },
        createdAt: { gte: since },
        status: { in: ["APPROVED", "PENDING"] }, // rejected don't damage
      },
    }),
    prisma.post.count({
      where: { communityId, createdAt: { gte: since } },
    }),
    prisma.comment.count({
      where: { post: { communityId }, createdAt: { gte: since } },
    }),
  ]);

  const damage =
    checkins * cfg.dmgPerCheckin +
    posts * cfg.dmgPerPost +
    comments * cfg.dmgPerComment;
  const currentHp = Math.max(0, cfg.maxHp - damage);
  return {
    ...cfg,
    currentHp,
    hpPct: cfg.maxHp > 0 ? currentHp / cfg.maxHp : 0,
    defeated: currentHp === 0,
    activitySince: since,
  };
}
