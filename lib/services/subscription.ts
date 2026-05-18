/**
 * Subscription tier service — gate features by tier level.
 *
 * Each community can define up to 3 tiers (stored in Community.tiersConfig).
 * Default tiers if not configured:
 *   EXPLORER (free) — basic access
 *   BUILDER (paid)  — full challenges + courses
 *   PRO (premium)   — exclusive + 1-on-1 + unlimited AI
 *
 * Gate rules are per-community. The service checks the user's active
 * subscription for the community and returns their effective tier.
 */
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createPayment } from "@/lib/sepay";
import { getPaymentConfig } from "@/lib/community-config";

/* ===== Config types ===== */

export const TierGateSchema = z.object({
  challengeDifficulty: z.array(z.string()).optional(), // allowed difficulties
  courseLevel: z.array(z.string()).optional(), // allowed course levels
  qaPerWeek: z.number().int().nonnegative().optional(), // null = unlimited
  marketplaceDiscount: z.number().min(0).max(100).optional(), // percent
  aiAgentAccess: z.boolean().optional(),
  mentorBooking: z.boolean().optional(),
});

export const TierConfigItemSchema = z.object({
  key: z.string().min(1).max(30),
  label: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
  priceVndWeekly: z.number().nonnegative().optional(),
  priceVndMonthly: z.number().nonnegative().optional(),
  priceVndYearly: z.number().nonnegative().optional(),
  isFree: z.boolean().optional(),
  gates: TierGateSchema.optional(),
  description: z.string().max(500).optional(),
});

export type TierConfigItem = z.infer<typeof TierConfigItemSchema>;
export type TierGate = z.infer<typeof TierGateSchema>;

export const DEFAULT_TIERS: TierConfigItem[] = [
  {
    key: "explorer",
    label: "Explorer",
    emoji: "🔍",
    isFree: true,
    description: "Truy cập cơ bản — xem feed, chat, join challenge dễ, course basic.",
    gates: {
      challengeDifficulty: ["NORMAL"],
      courseLevel: ["BASIC"],
      qaPerWeek: 3,
      marketplaceDiscount: 0,
      aiAgentAccess: false,
      mentorBooking: false,
    },
  },
  {
    key: "builder",
    label: "Builder",
    emoji: "🛠️",
    priceVndWeekly: 99000,
    priceVndMonthly: 299000,
    priceVndYearly: 2490000,
    description: "Full access — tất cả challenges + courses + AI Agent giới hạn.",
    gates: {
      challengeDifficulty: ["NORMAL", "HARD", "CHAOS"],
      courseLevel: ["BASIC", "ADVANCED", "EXPERT"],
      qaPerWeek: undefined, // unlimited
      marketplaceDiscount: 10,
      aiAgentAccess: true,
      mentorBooking: false,
    },
  },
  {
    key: "pro",
    label: "Pro",
    emoji: "🔥",
    priceVndWeekly: 199000,
    priceVndMonthly: 499000,
    priceVndYearly: 3990000,
    description: "Premium — AI unlimited, 1-on-1 mentor, marketplace 20% off.",
    gates: {
      challengeDifficulty: ["NORMAL", "HARD", "CHAOS"],
      courseLevel: ["BASIC", "ADVANCED", "EXPERT"],
      qaPerWeek: undefined,
      marketplaceDiscount: 20,
      aiAgentAccess: true,
      mentorBooking: true,
    },
  },
];

/**
 * Read the community's tier configuration. Falls back to DEFAULT_TIERS
 * if not configured.
 */
export function getTiersConfig(raw: unknown): TierConfigItem[] {
  if (raw === null || raw === undefined) return DEFAULT_TIERS;
  if (!Array.isArray(raw)) return DEFAULT_TIERS;
  const out: TierConfigItem[] = [];
  for (const item of raw) {
    const parsed = TierConfigItemSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out.length > 0 ? out : DEFAULT_TIERS;
}

/**
 * Get the effective tier for a user in a community.
 * Looks up active Subscription → if none, returns "explorer" (free tier).
 */
export async function getUserTier(input: {
  userId: string;
  communityId: string;
}): Promise<{ tierKey: string; subscription: { id: string; expiresAt: Date | null } | null }> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId: input.userId,
      communityId: input.communityId,
      status: "ACTIVE",
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: { id: true, tier: true, expiresAt: true },
    orderBy: { startedAt: "desc" },
  });
  if (sub) {
    return { tierKey: sub.tier, subscription: { id: sub.id, expiresAt: sub.expiresAt } };
  }
  return { tierKey: "explorer", subscription: null };
}

/**
 * Get the gate config for a specific tier key.
 */
export function getGateForTier(
  tierKey: string,
  tiersConfig: TierConfigItem[]
): TierGate {
  const tier = tiersConfig.find((t) => t.key === tierKey);
  if (!tier?.gates) {
    // Unknown tier → most restrictive (explorer gates)
    return DEFAULT_TIERS[0].gates!;
  }
  return tier.gates;
}

/**
 * Check if a user's current tier allows a specific action.
 * Returns { allowed: true } or { allowed: false, requiredTier, upgradeMessage }.
 */
export async function checkGate(input: {
  userId: string;
  communityId: string;
  tiersConfig: TierConfigItem[];
  check:
    | { type: "challenge_difficulty"; difficulty: string }
    | { type: "course_level"; level: string }
    | { type: "ai_agent" }
    | { type: "mentor_booking" };
}): Promise<
  | { allowed: true }
  | { allowed: false; requiredTier: string; message: string }
> {
  const { tierKey } = await getUserTier({
    userId: input.userId,
    communityId: input.communityId,
  });
  const gate = getGateForTier(tierKey, input.tiersConfig);

  switch (input.check.type) {
    case "challenge_difficulty": {
      const allowed = gate.challengeDifficulty?.includes(input.check.difficulty) ?? true;
      if (allowed) return { allowed: true };
      return {
        allowed: false,
        requiredTier: "builder",
        message: `Challenge ${input.check.difficulty} yêu cầu tier Builder trở lên`,
      };
    }
    case "course_level": {
      const allowed = gate.courseLevel?.includes(input.check.level) ?? true;
      if (allowed) return { allowed: true };
      return {
        allowed: false,
        requiredTier: "builder",
        message: `Khoá học ${input.check.level} yêu cầu tier Builder trở lên`,
      };
    }
    case "ai_agent": {
      if (gate.aiAgentAccess) return { allowed: true };
      return {
        allowed: false,
        requiredTier: "builder",
        message: "AI Agent yêu cầu tier Builder trở lên",
      };
    }
    case "mentor_booking": {
      if (gate.mentorBooking) return { allowed: true };
      return {
        allowed: false,
        requiredTier: "pro",
        message: "1-on-1 Mentor yêu cầu tier Pro",
      };
    }
  }
}

/**
 * Create a PENDING subscription + payment order for a paid tier.
 */
export async function startTierSubscription(input: {
  userId: string;
  communityId: string;
  tierKey: string;
  priceVnd: number;
  durationDays: number;
}): Promise<{ paymentCode: string }> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.durationDays);

  const sub = await prisma.subscription.create({
    data: {
      userId: input.userId,
      communityId: input.communityId,
      tier: input.tierKey,
      status: "PENDING",
      amountVnd: input.priceVnd,
      expiresAt,
    },
  });

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { billingModel: true },
  });
  const bankCfg = community ? getPaymentConfig(community) : null;
  if (!bankCfg) throw new Error("payment_not_configured");
  const payment = await createPayment({
    userId: input.userId,
    communityId: input.communityId,
    purpose: "subscription",
    refType: "subscription",
    refId: sub.id,
    amountVnd: input.priceVnd,
    ttlMinutes: 1440,
    bankCode: bankCfg.bankCode,
    bankAccount: bankCfg.bankAccount,
    bankHolder: bankCfg.bankHolder,
    bankName: bankCfg.bankName,
  });

  logger.info({ userId: input.userId, communityId: input.communityId, tier: input.tierKey }, "[subscription] payment started");
  return { paymentCode: payment.paymentCode };
}

/**
 * Activate a subscription (called after payment confirmation).
 */
export async function activateSubscription(input: {
  userId: string;
  communityId: string;
  tier: string;
  durationDays: number;
  amountVnd: number;
  paymentRef?: string;
}) {
  // Cancel any existing active subscription in this community
  await prisma.subscription.updateMany({
    where: {
      userId: input.userId,
      communityId: input.communityId,
      status: "ACTIVE",
    },
    data: { status: "REPLACED", cancelledAt: new Date() },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.durationDays);

  const sub = await prisma.subscription.create({
    data: {
      userId: input.userId,
      communityId: input.communityId,
      tier: input.tier,
      status: "ACTIVE",
      expiresAt,
      amountVnd: input.amountVnd,
      paymentRef: input.paymentRef ?? null,
    },
  });
  logger.info(
    {
      subscriptionId: sub.id,
      userId: input.userId,
      tier: input.tier,
      days: input.durationDays,
    },
    "[subscription] activated"
  );
  await prisma.membership.upsert({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: input.communityId,
      },
    },
    create: {
      userId: input.userId,
      communityId: input.communityId,
      role: "MEMBER",
    },
    update: {},
  });
  return sub;
}
