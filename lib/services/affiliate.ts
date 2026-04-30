/**
 * Affiliate / Referral service.
 * - User generates per-community AffiliateLink (unique code).
 * - Click increments AffiliateLink.clicks (best-effort, no IP block).
 * - On signup, cookie-attribution creates Referral row (status=PENDING).
 * - On Purchase COMPLETED, mark referral CONVERTED with commissionVnd.
 */
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

function genCode(len = 8): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const DEFAULT_COMMISSION_PERCENT = 10;

export interface AffiliateConfig {
  enabled: boolean;
  commissionPercent: number; // 0-100
  cookieDays: number;
}

export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  enabled: false,
  commissionPercent: DEFAULT_COMMISSION_PERCENT,
  cookieDays: 30,
};

export function getAffiliateConfig(c: { affiliateConfig?: unknown }): AffiliateConfig {
  if (!c.affiliateConfig || typeof c.affiliateConfig !== "object")
    return DEFAULT_AFFILIATE_CONFIG;
  const raw = c.affiliateConfig as Partial<AffiliateConfig>;
  return {
    enabled: !!raw.enabled,
    commissionPercent:
      typeof raw.commissionPercent === "number"
        ? Math.min(100, Math.max(0, raw.commissionPercent))
        : DEFAULT_COMMISSION_PERCENT,
    cookieDays:
      typeof raw.cookieDays === "number" ? Math.max(1, raw.cookieDays) : 30,
  };
}

/** Idempotent: return existing link or create one. */
export async function getOrCreateAffiliateLink(input: {
  userId: string;
  communityId: string;
}) {
  const existing = await prisma.affiliateLink.findFirst({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  let code = genCode();
  // collision dedupe
  while (await prisma.affiliateLink.findUnique({ where: { code } })) {
    code = genCode();
  }
  const created = await prisma.affiliateLink.create({
    data: { userId: input.userId, code },
  });
  logger.info(
    { userId: input.userId, code },
    "[affiliate] link created"
  );
  return created;
}

export async function trackClick(code: string) {
  await prisma.affiliateLink
    .update({ where: { code }, data: { clicks: { increment: 1 } } })
    .catch(() => {});
}

/**
 * Called on signup: if user has fc_ref cookie, create pending Referral row.
 * Owner = AffiliateLink.userId, referredUserId = new user.
 */
export async function attributeReferralOnSignup(input: {
  referredUserId: string;
  refCode: string;
}) {
  const link = await prisma.affiliateLink.findUnique({
    where: { code: input.refCode },
    select: { id: true, userId: true },
  });
  if (!link) return null;
  if (link.userId === input.referredUserId) return null; // self-referral block
  const existing = await prisma.referral.findFirst({
    where: {
      linkId: link.id,
      referredUserId: input.referredUserId,
    },
  });
  if (existing) return existing;
  const ref = await prisma.referral.create({
    data: {
      linkId: link.id,
      referredUserId: input.referredUserId,
      status: "PENDING",
    },
  });
  logger.info(
    { linkId: link.id, referredUserId: input.referredUserId },
    "[affiliate] referral attributed"
  );
  return ref;
}

/**
 * Called from payment match: when a user makes a successful purchase, find
 * any pending referral attributed to them and convert it. Commission is
 * computed from the COMMUNITY's affiliateConfig where the product lives.
 */
export async function convertReferralFromPurchase(
  purchaseId: string,
  buyerUserId: string,
) {
  const ref = await prisma.referral.findFirst({
    where: {
      referredUserId: buyerUserId,
      status: "PENDING",
    },
    include: { link: true },
  });
  if (!ref) return null;
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      amountVnd: true,
      product: { select: { communityId: true } },
    },
  });
  if (!purchase) return null;
  const community = await prisma.community.findUnique({
    where: { id: purchase.product.communityId },
    select: { affiliateConfig: true },
  });
  const cfg = getAffiliateConfig({ affiliateConfig: community?.affiliateConfig });
  if (!cfg.enabled) return null;

  const amount = Number(purchase.amountVnd);
  const commission = Math.floor((amount * cfg.commissionPercent) / 100);
  const updated = await prisma.referral.update({
    where: { id: ref.id },
    data: {
      status: "CONVERTED",
      convertedAt: new Date(),
      commissionVnd: commission,
    },
  });
  logger.info(
    { referralId: ref.id, commission, amount },
    "[affiliate] referral converted"
  );
  return updated;
}

export async function listMyReferrals(userId: string) {
  const link = await prisma.affiliateLink.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!link) return { link: null, referrals: [], stats: null };
  const referrals = await prisma.referral.findMany({
    where: { linkId: link.id },
    orderBy: { createdAt: "desc" },
    include: {
      referredUser: { select: { id: true, name: true, image: true, email: true } },
    },
  });
  const totalCommission = referrals
    .filter((r) => r.status === "CONVERTED")
    .reduce((sum, r) => sum + Number(r.commissionVnd ?? 0), 0);
  const conversions = referrals.filter((r) => r.status === "CONVERTED").length;
  return {
    link,
    referrals,
    stats: {
      clicks: link.clicks,
      signups: referrals.length,
      conversions,
      totalCommission,
    },
  };
}

export async function updateAffiliateConfig(input: {
  userId: string;
  communityId: string;
  enabled: boolean;
  commissionPercent: number;
  cookieDays: number;
}) {
  const c = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("community_not_found");
  if (c.ownerId !== input.userId)
    throw new Error("Chỉ owner mới sửa được affiliate config");
  await prisma.community.update({
    where: { id: input.communityId },
    data: {
      affiliateConfig: {
        enabled: input.enabled,
        commissionPercent: Math.min(100, Math.max(0, input.commissionPercent)),
        cookieDays: Math.max(1, input.cookieDays),
      },
    },
  });
}
