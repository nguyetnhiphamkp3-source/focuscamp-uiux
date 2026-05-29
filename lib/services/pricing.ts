/**
 * Tiered pricing — calculate effective price for challenge / product entry
 * based on user's community membership tier.
 *
 * guestVnd   = price for users with no community membership
 * memberVnd  = base price for any active member (overrides guestVnd)
 * tierPrices = per-tier override map { tierKey → amountVnd }
 * aipPrice   = price in AIP tokens (only available to members with AIP balance)
 * aipEnabled = whether AIP payment option is shown
 *
 * lateFeeEnabled      = whether a late fee applies when a member re-creates payment after the grace window
 * lateFeeVnd          = surcharge amount in VND added on top of the base price
 * lateFeeGraceMinutes = minutes after join during which NO late fee applies
 */

export type PricingConfig = {
  guestVnd?: number
  memberVnd?: number
  tierPrices?: Record<string, number>
  aipPrice?: number
  aipEnabled?: boolean
  lateFeeEnabled?: boolean
  lateFeeVnd?: number
  lateFeeGraceMinutes?: number
}

export type EffectivePrice = {
  vnd: number           // 0 = free
  canPayAip: boolean
  aipPrice: number      // 0 if canPayAip = false
  aipBalance: number
}

export function parsePricingConfig(raw: unknown): PricingConfig | null {
  if (!raw || typeof raw !== "object") return null
  const c = raw as Record<string, unknown>
  return {
    guestVnd:   typeof c.guestVnd   === "number" ? c.guestVnd   : undefined,
    memberVnd:  typeof c.memberVnd  === "number" ? c.memberVnd  : undefined,
    aipPrice:   typeof c.aipPrice   === "number" ? c.aipPrice   : undefined,
    aipEnabled: typeof c.aipEnabled === "boolean" ? c.aipEnabled : false,
    tierPrices: c.tierPrices && typeof c.tierPrices === "object"
      ? (c.tierPrices as Record<string, number>)
      : undefined,
    lateFeeEnabled:      typeof c.lateFeeEnabled      === "boolean" ? c.lateFeeEnabled      : false,
    lateFeeVnd:          typeof c.lateFeeVnd          === "number"  ? c.lateFeeVnd          : undefined,
    lateFeeGraceMinutes: typeof c.lateFeeGraceMinutes === "number"  ? c.lateFeeGraceMinutes : undefined,
  }
}

/**
 * Compute the late-fee surcharge (VND) for a challenge payment renewal.
 * Single source of truth shared by the server action (actual charge) and the
 * page (pre-click display) so the two never drift apart.
 * Returns 0 unless the fee is enabled, positive, and the grace window has elapsed.
 */
export function computeChallengeLateFee(
  config: PricingConfig | null,
  minutesSinceJoin: number,
): number {
  if (!config || config.lateFeeEnabled !== true) return 0
  const fee = config.lateFeeVnd ?? 0
  const grace = config.lateFeeGraceMinutes ?? 30
  if (fee <= 0) return 0
  return minutesSinceJoin > grace ? fee : 0
}

/**
 * Calculate what a user should pay given their membership context.
 * tierKey = null means the user is not a community member (guest).
 */
export function calculateEffectivePrice(
  config: PricingConfig | null,
  context: {
    isMember: boolean
    tierKey: string | null
    aipBalance: number
  }
): EffectivePrice {
  if (!config) return { vnd: 0, canPayAip: false, aipPrice: 0, aipBalance: context.aipBalance }

  let vnd = 0

  if (!context.isMember) {
    // Guest — must pay full guest price; no AIP option
    vnd = config.guestVnd ?? 0
    return { vnd, canPayAip: false, aipPrice: 0, aipBalance: 0 }
  }

  // Member — check per-tier override first, then memberVnd, then guestVnd
  const tier = context.tierKey?.toLowerCase()
  if (tier && config.tierPrices?.[tier] !== undefined) {
    vnd = config.tierPrices[tier]
  } else if (config.memberVnd !== undefined) {
    vnd = config.memberVnd
  } else if (config.guestVnd !== undefined) {
    vnd = config.guestVnd
  }

  const aipPrice = config.aipEnabled && config.aipPrice ? config.aipPrice : 0
  const canPayAip = aipPrice > 0 && context.aipBalance >= aipPrice

  return { vnd, canPayAip, aipPrice, aipBalance: context.aipBalance }
}
