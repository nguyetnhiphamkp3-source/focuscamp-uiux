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
import { assertCommunityPermission } from "@/lib/services/community-settings";

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
  const existing = await prisma.affiliateLink.findUnique({
    where: { userId_communityId: { userId: input.userId, communityId: input.communityId } },
  });
  if (existing) return existing;
  let code = genCode();
  while (await prisma.affiliateLink.findUnique({ where: { code } })) {
    code = genCode();
  }
  const created = await prisma.affiliateLink.create({
    data: { userId: input.userId, communityId: input.communityId, code },
  });
  logger.info(
    { userId: input.userId, communityId: input.communityId, code },
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
 * Normalize a Gmail-style address so `user@gmail.com`, `u.s.e.r@gmail.com`,
 * and `user+anything@gmail.com` collapse to the same canonical form. Used
 * to detect multi-account self-referral fraud.
 */
function canonicalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const lower = email.trim().toLowerCase();
  const at = lower.indexOf("@");
  if (at <= 0) return null;
  let local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  // Strip +tag for any provider
  const plus = local.indexOf("+");
  if (plus !== -1) local = local.slice(0, plus);
  // Gmail/Googlemail ignores dots in local part
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

/**
 * Heuristic: same canonical email = same person. Catches gmail+tag abuse
 * and dot-trick. Doesn't catch totally separate email providers — that's
 * what holding-period + manual review are for.
 */
async function detectSelfReferralByEmail(
  referrerUserId: string,
  referredUserId: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([
    prisma.user.findUnique({
      where: { id: referrerUserId },
      select: { email: true },
    }),
    prisma.user.findUnique({
      where: { id: referredUserId },
      select: { email: true },
    }),
  ]);
  const ca = canonicalizeEmail(a?.email);
  const cb = canonicalizeEmail(b?.email);
  return !!(ca && cb && ca === cb);
}

/**
 * Called on signup: if user has fc_ref cookie, create pending Referral row.
 * Owner = AffiliateLink.userId, referredUserId = new user.
 *
 * Status:
 *   PENDING    — normal, will auto-convert on Purchase
 *   SUSPICIOUS — fraud heuristic tripped (same canonical email, etc.)
 *                Skipped by auto-convert; owner must manually approve.
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
  if (link.userId === input.referredUserId) return null; // direct self-referral
  const existing = await prisma.referral.findFirst({
    where: {
      linkId: link.id,
      referredUserId: input.referredUserId,
    },
  });
  if (existing) return existing;

  // Multi-account self-ref detection (gmail+tag, dots, etc.)
  const sameEmail = await detectSelfReferralByEmail(
    link.userId,
    input.referredUserId,
  );

  const ref = await prisma.referral.create({
    data: {
      linkId: link.id,
      referredUserId: input.referredUserId,
      status: sameEmail ? "SUSPICIOUS" : "PENDING",
    },
  });
  logger.info(
    {
      linkId: link.id,
      referredUserId: input.referredUserId,
      status: ref.status,
    },
    "[affiliate] referral attributed",
  );
  return ref;
}

/**
 * Called from payment match: when a user makes a successful purchase, find
 * a pending referral attributed to them in the purchased product's community
 * and convert it. Commission is computed from that community's affiliateConfig.
 *
 * SUSPICIOUS referrals are skipped here — owner must manually approve them
 * via the affiliate dashboard before commission is awarded.
 */
export async function convertReferralFromPurchase(
  purchaseId: string,
  buyerUserId: string,
) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      amountVnd: true,
      product: { select: { communityId: true } },
    },
  });
  if (!purchase) return null;

  const ref = await prisma.referral.findFirst({
    where: {
      referredUserId: buyerUserId,
      status: "PENDING", // SUSPICIOUS deliberately excluded
      link: { communityId: purchase.product.communityId },
    },
  });
  if (!ref) return null;

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
  const links = await prisma.affiliateLink.findMany({
    where: { userId },
    include: {
      community: { select: { id: true, name: true, slug: true, iconUrl: true } },
      referrals: {
        orderBy: { createdAt: "desc" },
        include: {
          referredUser: { select: { id: true, name: true, image: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return links.map((link) => {
    const conversions = link.referrals.filter((r) => r.status === "CONVERTED").length;
    const totalCommission = link.referrals
      .filter((r) => r.status === "CONVERTED")
      .reduce((sum, r) => sum + Number(r.commissionVnd ?? 0), 0);
    return {
      community: link.community,
      link: { id: link.id, code: link.code, clicks: link.clicks, createdAt: link.createdAt },
      referrals: link.referrals,
      stats: { clicks: link.clicks, signups: link.referrals.length, conversions, totalCommission },
    };
  });
}

/** Mark a CONVERTED referral's payout status (PAID or REJECTED) */
export async function markReferralPayout(input: {
  referralId: string;
  ownerId: string;
  communityId: string;
  status: "PAID" | "REJECTED";
  note?: string;
}) {
  await assertCommunityPermission(input.ownerId, input.communityId, "manage_settings");
  const referral = await prisma.referral.findUnique({
    where: { id: input.referralId },
  });
  if (!referral) {
    throw new Error("referral_not_found");
  }
  if (referral.status !== "CONVERTED") {
    throw new Error("not_converted");
  }
  return prisma.referral.update({
    where: { id: input.referralId },
    data: { payoutStatus: input.status, payoutNote: input.note ?? null },
  });
}

export async function updateAffiliateConfig(input: {
  userId: string;
  communityId: string;
  enabled: boolean;
  commissionPercent: number;
  cookieDays: number;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_settings");
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

/** List all affiliate links for a community with aggregated stats */
export async function listCommunityAffiliates(communityId: string) {
  const links = await prisma.affiliateLink.findMany({
    where: { communityId },
    include: {
      user: { select: { id: true, name: true, image: true } },
      referrals: { select: { status: true, commissionVnd: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const affiliates = links.map((link) => ({
    link,
    user: link.user,
    stats: {
      clicks: link.clicks,
      signups: link.referrals.length,
      conversions: link.referrals.filter((r) => r.status === "CONVERTED").length,
      totalCommission: link.referrals
        .filter((r) => r.status === "CONVERTED")
        .reduce((sum, r) => sum + Number(r.commissionVnd ?? 0), 0),
    },
  }));
  const totals = {
    affiliates: links.length,
    referrals: affiliates.reduce((s, a) => s + a.stats.signups, 0),
    conversions: affiliates.reduce((s, a) => s + a.stats.conversions, 0),
    totalCommission: affiliates.reduce((s, a) => s + a.stats.totalCommission, 0),
  };
  return { affiliates, totals };
}

/** List all referrals for a community */
export async function listCommunityReferrals(communityId: string) {
  return prisma.referral.findMany({
    where: { link: { communityId } },
    include: {
      referredUser: { select: { id: true, name: true, image: true } },
      link: { select: { code: true, user: { select: { id: true, name: true, image: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Approve a SUSPICIOUS referral — set status back to PENDING */
export async function approveSuspiciousReferral(
  referralId: string,
  approverId: string,
  communityId: string,
) {
  await assertCommunityPermission(approverId, communityId, "manage_settings");
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    include: { link: true },
  });
  if (!referral || referral.link.communityId !== communityId) {
    throw new Error("referral_not_found");
  }
  if (referral.status !== "SUSPICIOUS") {
    throw new Error("not_suspicious");
  }
  return prisma.referral.update({
    where: { id: referralId },
    data: { status: "PENDING" },
  });
}
