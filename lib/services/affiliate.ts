/**
 * Affiliate / Referral service.
 * - User generates per-community AffiliateLink (unique code).
 * - Click increments AffiliateLink.clicks (best-effort, no IP block).
 * - On signup, cookie-attribution creates Referral row (status=PENDING).
 * - On qualifying paid order COMPLETED, mark referral CONVERTED with commissionVnd.
 */
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
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

/** Clamp percent to [0,100] and round to 2 dp so the stored value matches the
 * value used in commission math (commissionPercent is Decimal(5,2)). */
function clampPercent(p: number): number {
  return Math.round(Math.min(100, Math.max(0, p)) * 100) / 100;
}

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
        ? clampPercent(raw.commissionPercent)
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

  // Only members (or the owner) of the community may mint an affiliate link.
  const member = await prisma.membership.findUnique({
    where: { userId_communityId: { userId: input.userId, communityId: input.communityId } },
    select: { id: true },
  });
  if (!member) {
    const community = await prisma.community.findUnique({
      where: { id: input.communityId },
      select: { ownerId: true },
    });
    if (!community) throw new Error("community_not_found");
    if (community.ownerId !== input.userId) throw new Error("not_a_member");
  }
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
    select: { id: true, userId: true, communityId: true },
  });
  if (!link) return null;
  if (link.userId === input.referredUserId) return null; // direct self-referral
  // First-touch policy: one referral per user per community. Dedupe across ALL
  // links of this community (not just this link) so a second link can't create
  // an ambiguous duplicate that later credits the wrong affiliate at conversion.
  const existing = await prisma.referral.findFirst({
    where: {
      referredUserId: input.referredUserId,
      link: { communityId: link.communityId },
    },
    orderBy: { createdAt: "asc" },
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
 * Convert a pending referral into a commission row.
 *
 * When `tx` is supplied the reads and the two writes (commission create +
 * referral update) run on the CALLER's transaction — so the commission is
 * atomic with the payment/order completion. The caller must NOT swallow errors
 * in that case: a throw rolls the whole completion back, and on retry the
 * idempotency key (referralId+sourceType+sourceId) makes it safe (existing row
 * is returned, no dupe). Without `tx`, the two writes still run atomically in
 * their own transaction.
 */
async function convertPendingReferralForCommunity(
  input: {
    buyerUserId: string;
    communityId: string;
    amountVnd: number;
    sourceType: "PRODUCT" | "CHALLENGE";
    sourceId: string;
    itemTitle?: string | null;
  },
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const ref = await db.referral.findFirst({
    where: {
      referredUserId: input.buyerUserId,
      status: { in: ["PENDING", "CONVERTED"] }, // SUSPICIOUS deliberately excluded
      link: { communityId: input.communityId },
    },
    select: { id: true, linkId: true, commissionVnd: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  if (!ref) return null;

  const community = await db.community.findUnique({
    where: { id: input.communityId },
    select: { affiliateConfig: true },
  });
  const cfg = getAffiliateConfig({ affiliateConfig: community?.affiliateConfig });
  if (!cfg.enabled) return null;

  const amount = Math.max(0, Math.floor(input.amountVnd));
  if (amount <= 0) return null;
  // L1: integer basis-points math avoids float drift. `amount * percent / 100`
  // floors wrong for fractional percent (50000 * 0.29 → 144.999… → 144) because
  // 0.29 isn't exact in float. commissionPercent is ≤2dp (clampPercent), so scale
  // it to integer hundredths and divide by 10000 — fully integer, exact: → 145.
  const percentHundredths = Math.round(cfg.commissionPercent * 100);
  const commission = Math.floor((amount * percentHundredths) / 10000);

  const existing = await db.affiliateCommission.findUnique({
    where: {
      referralId_sourceType_sourceId: {
        referralId: ref.id,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
  });
  if (existing) return existing;

  const write = async (client: Prisma.TransactionClient) => {
    const row = await client.affiliateCommission.create({
      data: {
        referralId: ref.id,
        linkId: ref.linkId,
        communityId: input.communityId,
        referredUserId: input.buyerUserId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        itemTitle: input.itemTitle ?? null,
        grossAmountVnd: amount,
        commissionPercent: cfg.commissionPercent,
        commissionVnd: commission,
      },
    });
    await client.referral.update({
      where: { id: ref.id },
      data: {
        status: "CONVERTED",
        convertedAt: ref.status === "PENDING" ? new Date() : undefined,
        commissionVnd: Number(ref.commissionVnd ?? 0) + commission,
      },
    });
    return row;
  };
  // Inside a caller txn → run directly (atomic with completion). Otherwise own txn.
  const created = tx ? await write(tx) : await prisma.$transaction(write);

  logger.info(
    { referralId: ref.id, commissionId: created.id, commission, amount, sourceType: input.sourceType },
    "[affiliate] referral converted"
  );
  return created;
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
  options?: { amountVnd?: number },
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const purchase = await db.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      amountVnd: true,
      product: { select: { communityId: true, title: true } },
    },
  });
  if (!purchase) return null;

  return convertPendingReferralForCommunity(
    {
      buyerUserId,
      communityId: purchase.product.communityId,
      amountVnd: options?.amountVnd ?? Number(purchase.amountVnd),
      sourceType: "PRODUCT",
      sourceId: purchaseId,
      itemTitle: purchase.product.title,
    },
    tx,
  );
}

/**
 * Convert a pending referral when a paid challenge entry succeeds. The
 * payment refId is a ChallengeMember id; commission uses only the challenge
 * entry amount, excluding an optional bump product add-on.
 */
export async function convertReferralFromChallengePayment(
  paymentId: string,
  buyerUserId: string,
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      amountVnd: true,
      metadata: true,
      refId: true,
      refType: true,
    },
  });
  if (!payment || payment.refType !== "challenge") return null;

  const member = await db.challengeMember.findUnique({
    where: { id: payment.refId },
    select: { challenge: { select: { communityId: true, title: true } } },
  });
  if (!member) return null;

  const meta =
    payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
      ? (payment.metadata as Record<string, unknown>)
      : {};
  const bumpPrice = Number(meta.bumpPriceVnd ?? 0);
  const amount = Number(payment.amountVnd) - (Number.isFinite(bumpPrice) ? bumpPrice : 0);

  return convertPendingReferralForCommunity(
    {
      buyerUserId,
      communityId: member.challenge.communityId,
      amountVnd: amount,
      sourceType: "CHALLENGE",
      sourceId: paymentId,
      itemTitle: member.challenge.title,
    },
    tx,
  );
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
  const linkIds = links.map((link) => link.id);
  const commissions = linkIds.length
    ? await prisma.affiliateCommission.findMany({
        where: { linkId: { in: linkIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const commissionsByLink = new Map<string, typeof commissions>();
  const commissionsByReferral = new Map<string, typeof commissions>();
  for (const commission of commissions) {
    commissionsByLink.set(commission.linkId, [
      ...(commissionsByLink.get(commission.linkId) ?? []),
      commission,
    ]);
    commissionsByReferral.set(commission.referralId, [
      ...(commissionsByReferral.get(commission.referralId) ?? []),
      commission,
    ]);
  }

  return links.map((link) => {
    const linkCommissions = commissionsByLink.get(link.id) ?? [];
    const conversions = linkCommissions.length;
    // Exclude REJECTED from the owed/earned total (UNPAID + PAID only).
    const totalCommission = linkCommissions
      .filter((c) => c.payoutStatus !== "REJECTED")
      .reduce((sum, c) => sum + Number(c.commissionVnd ?? 0), 0);
    return {
      community: link.community,
      link: { id: link.id, code: link.code, clicks: link.clicks, createdAt: link.createdAt },
      referrals: link.referrals.map((r) => {
        const referralCommissions = commissionsByReferral.get(r.id) ?? [];
        const referralCommissionTotal = referralCommissions
          .filter((c) => c.payoutStatus !== "REJECTED")
          .reduce((sum, c) => sum + Number(c.commissionVnd ?? 0), 0);
        const hasUnpaid = referralCommissions.some((c) => c.payoutStatus === "UNPAID");
        const hasRejected = referralCommissions.some((c) => c.payoutStatus === "REJECTED");
        return {
          ...r,
          commissionVnd: referralCommissions.length > 0 ? referralCommissionTotal : r.commissionVnd,
          payoutStatus: hasUnpaid
            ? "UNPAID"
            : hasRejected
              ? "REJECTED"
              : referralCommissions.length > 0
                ? "PAID"
                : r.payoutStatus,
          commissionCount: referralCommissions.length,
        };
      }),
      stats: { clicks: link.clicks, signups: link.referrals.length, conversions, totalCommission },
    };
  });
}

/** Mark a commission row's payout status (PAID or REJECTED). */
export async function markAffiliateCommissionPayout(input: {
  commissionId: string;
  ownerId: string;
  communityId: string;
  status: "PAID" | "REJECTED";
  note?: string;
}) {
  // Payout is a finance operation — gate on manage_orders, consistent with the
  // rest of the money flows (orders.ts), not manage_settings.
  await assertCommunityPermission(input.ownerId, input.communityId, "manage_orders");
  const commission = await prisma.affiliateCommission.findUnique({
    where: { id: input.commissionId },
  });
  if (!commission || commission.communityId !== input.communityId) {
    throw new Error("commission_not_found");
  }
  // Block re-marking an already-paid commission (prevents double-payout at the
  // bank layer + paidAt refresh). REJECTED stays reversible.
  if (commission.payoutStatus === "PAID") {
    throw new Error("already_paid");
  }
  return prisma.affiliateCommission.update({
    where: { id: input.commissionId },
    data: {
      payoutStatus: input.status,
      payoutNote: input.note ?? null,
      paidAt: input.status === "PAID" ? new Date() : null,
    },
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
        commissionPercent: clampPercent(input.commissionPercent),
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
      referrals: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const linkIds = links.map((link) => link.id);
  const commissions = linkIds.length
    ? await prisma.affiliateCommission.findMany({
        where: { linkId: { in: linkIds } },
        select: { linkId: true, commissionVnd: true, payoutStatus: true },
      })
    : [];
  const commissionsByLink = new Map<string, typeof commissions>();
  for (const commission of commissions) {
    commissionsByLink.set(commission.linkId, [
      ...(commissionsByLink.get(commission.linkId) ?? []),
      commission,
    ]);
  }
  const affiliates = links.map((link) => ({
    link,
    user: link.user,
    stats: {
      clicks: link.clicks,
      signups: link.referrals.length,
      conversions: (commissionsByLink.get(link.id) ?? []).length,
      totalCommission: (commissionsByLink.get(link.id) ?? [])
        .filter((c) => c.payoutStatus !== "REJECTED")
        .reduce((sum, c) => sum + Number(c.commissionVnd ?? 0), 0),
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

/** List all commission ledger rows for a community. */
export async function listCommunityCommissions(communityId: string) {
  return prisma.affiliateCommission.findMany({
    where: { communityId },
    include: {
      referral: {
        include: {
          referredUser: { select: { id: true, name: true, image: true } },
          link: { select: { code: true, user: { select: { id: true, name: true, image: true } } } },
        },
      },
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
