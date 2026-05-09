/**
 * Tiered pricing — calculate effective price for challenge / product entry
 * based on user's community membership tier.
 *
 * guestVnd   = price for users with no community membership
 * memberVnd  = base price for any active member (overrides guestVnd)
 * tierPrices = per-tier override map { tierKey → amountVnd }
 * aipPrice   = price in AIP tokens (only available to members with AIP balance)
 * aipEnabled = whether AIP payment option is shown
 */

export type PricingConfig = {
  guestVnd?: number
  memberVnd?: number
  tierPrices?: Record<string, number>
  aipPrice?: number
  aipEnabled?: boolean
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
  }
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
