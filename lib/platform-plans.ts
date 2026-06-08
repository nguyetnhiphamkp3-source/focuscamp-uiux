/**
 * Platform plans — focus.camp charges community owners monthly to keep their
 * community active. Each community has its own plan + expiry; user wanting
 * multiple communities pays separately for each.
 *
 * Plan lifecycle:
 *   PENDING       — community created, no payment yet → read-only entirely
 *   ACTIVE        — planExpiresAt > now → full access
 *   GRACE         — past expiry but within 7 days → read-only writes blocked,
 *                   owner can still renew
 *   EXPIRED       — past grace → read-only for everyone (members can browse,
 *                   owner can only renew)
 *   GRANDFATHERED — pre-launch communities, lifetime free, no expiry
 */

export const GRACE_PERIOD_DAYS = 7;

export type PlanTier = "SOLO" | "PRO" | "AGENCY" | "GRANDFATHER";
export type PaidPlanTier = Exclude<PlanTier, "GRANDFATHER">;

export interface PlanConfig {
  tier: PlanTier;
  label: string;
  priceVnd: number;
  features: string[];
}

export const DEFAULT_PLATFORM_PLAN_TIER: PaidPlanTier = "AGENCY";
export const ACTIVE_PLATFORM_PLAN_TIERS = [DEFAULT_PLATFORM_PLAN_TIER] as const;
export const DISPLAY_PLATFORM_PLAN_TIERS = ["SOLO", "PRO", "AGENCY"] as const;

export const PLATFORM_PLAN_DISPLAY: Record<
  PaidPlanTier,
  { label: string; available: boolean; badge?: string }
> = {
  SOLO: { label: "Solo", available: false, badge: "Coming soon" },
  PRO: { label: "Pro", available: false, badge: "Coming soon" },
  AGENCY: { label: "Agency", available: true },
};

const COMMUNITY_PLAN_FEATURES = [
  "Cộng đồng riêng mang thương hiệu của bạn",
  "Chat, bảng tin, hỏi đáp, CỐT và tín hiệu",
  "Challenge 4 chế độ: theo thời gian, tuần tự, kết hợp, thủ công",
  "Check-in, nộp bằng chứng, duyệt bài và bảng xếp hạng",
  "Khóa học, bài học và theo dõi tiến độ học viên",
  "Marketplace bán sản phẩm số, khóa học hoặc challenge",
  "Thanh toán tự động qua SePay",
  "Coupon và hoa hồng affiliate",
  "AI Agent riêng cho từng cộng đồng",
  "Quản lý thành viên và phân quyền admin/mod/member",
  "Email support 24h",
  "White-label domain riêng (coming soon)",
];

export const PLATFORM_PLANS: Record<PaidPlanTier, PlanConfig> = {
  SOLO: {
    tier: "SOLO",
    label: "Solo",
    priceVnd: 1_000_000,
    features: COMMUNITY_PLAN_FEATURES,
  },
  PRO: {
    tier: "PRO",
    label: "Pro",
    priceVnd: 1_000_000,
    features: COMMUNITY_PLAN_FEATURES,
  },
  AGENCY: {
    tier: "AGENCY",
    label: "Agency",
    priceVnd: 1_499_000,
    features: COMMUNITY_PLAN_FEATURES,
  },
};

export type PlanStatus =
  | "active"
  | "grace"
  | "expired"
  | "pending"
  | "grandfathered";

export interface PlanState {
  status: PlanStatus;
  tier: PlanTier;
  expiresAt: Date | null;
  /** Days remaining (positive when active; negative inside grace; null for grandfather/pending) */
  daysLeft: number | null;
}

export interface CommunityPlanSource {
  planTier: string;
  planExpiresAt: Date | null;
}

export function getPlanStatus(c: CommunityPlanSource, now: Date = new Date()): PlanState {
  const tier = (c.planTier || DEFAULT_PLATFORM_PLAN_TIER) as PlanTier;

  if (tier === "GRANDFATHER") {
    return { status: "grandfathered", tier, expiresAt: null, daysLeft: null };
  }

  if (!c.planExpiresAt) {
    return { status: "pending", tier, expiresAt: null, daysLeft: null };
  }

  const expiresAt = c.planExpiresAt;
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / msPerDay);

  if (diffMs > 0) return { status: "active", tier, expiresAt, daysLeft };
  if (-diffMs <= GRACE_PERIOD_DAYS * msPerDay)
    return { status: "grace", tier, expiresAt, daysLeft };
  return { status: "expired", tier, expiresAt, daysLeft };
}

/**
 * Whether anyone (member, owner) can write content to the community.
 * - active / grandfathered → write OK
 * - grace → still allowed (banner warns owner to renew)
 * - expired → blocked (read-only)
 * - pending → blocked (community not active yet)
 */
export function canWrite(state: PlanState): boolean {
  return (
    state.status === "active" ||
    state.status === "grandfathered" ||
    state.status === "grace"
  );
}

/** Whether community content is at all viewable. PENDING blocks even reads. */
export function canRead(state: PlanState): boolean {
  return state.status !== "pending";
}

export function planLabel(tier: PlanTier): string {
  if (tier === "GRANDFATHER") return "Lifetime (grandfather)";
  return PLATFORM_PLANS[tier]?.label ?? PLATFORM_PLANS[DEFAULT_PLATFORM_PLAN_TIER].label;
}

export function planPriceVnd(tier: PlanTier): number {
  if (tier === "GRANDFATHER") return 0;
  return PLATFORM_PLANS[tier]?.priceVnd ?? PLATFORM_PLANS[DEFAULT_PLATFORM_PLAN_TIER].priceVnd;
}

/** Compute new expiry after a successful renewal payment. */
export function extendExpiry(current: Date | null, now: Date = new Date()): Date {
  // If current is in the future, extend from there. Else extend from now.
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
}
