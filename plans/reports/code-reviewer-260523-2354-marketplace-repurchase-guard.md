# Code Review — Marketplace Re-purchase Guard

**Status: NEEDS_CHANGES** (1 Blocker, 4 Concerns, 4 Nits)

## Scope
- `lib/services/payment.ts` (startProductPurchase guard, fulfillBumpInTx helper, webhook bump paths)
- `app/actions/marketplace.ts` (addBumpToPaymentAction guard, simulatePaymentCompletedAction bump path)
- `app/actions/cart.ts` (checkoutCartAction filter)
- `app/c/[slug]/marketplace/[productSlug]/page.tsx` (owned badge + buy() catch)
- `app/pay/[paymentCode]/page.tsx` (userOwnsNonSubscription for bump/upsell)
- `app/cart/page.tsx` (bumpCandidate notIn ownedNonSub)

Schema verified: `Product.isSubscription` exists (line 613 of prisma/schema.prisma). `Payment.userId` is non-nullable. `Purchase` has `@@index([userId, productId])` — guard queries are well-indexed.

## Overall Assessment

The guard is **correctly layered** at the right boundaries (service, cart, bump action, webhook helper) and the subscription carve-out is consistent everywhere. UI and server enforcement match. However, there is **one production-relevant idempotency gap** in the cart-fulfillment branch of the webhook, and a couple of edge cases worth fixing before ship.

---

## Blockers

### B1 — Cart webhook fulfillment has no duplicate-Purchase guard
**File:** `lib/services/payment.ts:398-414`

The `refType === "cart"` branch in `matchSePayTransactionToPayment` blindly iterates `meta.breakdown` and `tx.purchase.create()` for each item with no check against existing COMPLETED Purchases. The new guard exists in `checkoutCartAction` (filtering before creating the Payment), but the webhook itself is the trust boundary for SePay callbacks.

**Failure modes:**
1. **Stale cart payments**: User adds A+B, checkout creates Payment#1 with breakdown=[A,B]. Before paying, they buy A standalone in another tab — Payment#2 completes, Purchase(A) exists. Then they pay Payment#1 via QR → webhook creates a duplicate Purchase(A). The cart filter only ran at checkout time, not at fulfillment time.
2. **Webhook retry**: If SePay re-delivers the same webhook (rare but possible) and the txn linking idempotency fails, the cart branch would also re-create. The other branches (product/challenge) at least rely on `purchase.updateMany` (idempotent on the existing PENDING row) and the `bumpFulfilled` flag.

**Fix:** Inside the cart loop, mirror the `fulfillBumpInTx` pattern — check `findFirst` for an existing COMPLETED Purchase for `{userId, productId}` (when product is non-subscription) and skip create. Or use `upsert` keyed on a paymentRef. Minimum viable fix:

```ts
} else if (payment.refType === "cart") {
  type CartBreakdownItem = { productId: string; amountVnd: number };
  const meta = (payment.metadata ?? {}) as { breakdown?: CartBreakdownItem[] };
  if (Array.isArray(meta.breakdown)) {
    for (const item of meta.breakdown) {
      const prod = await tx.product.findUnique({
        where: { id: item.productId },
        select: { isSubscription: true },
      });
      if (prod && !prod.isSubscription) {
        const owned = await tx.purchase.findFirst({
          where: { userId: payment.userId, productId: item.productId, status: "COMPLETED" },
          select: { id: true },
        });
        if (owned) continue;
      }
      await tx.purchase.create({ ... });
    }
  }
}
```

---

## Concerns

### C1 — `fulfillBumpInTx` early-return on null userId silently skips marking bumpFulfilled
**File:** `lib/services/payment.ts:52-90`

```ts
if (!userId) return;
```

When `userId` is null, the helper returns without setting `metadata.bumpFulfilled=true`. On the next webhook delivery (if any), the calling block will try again — same null userId, same skip, infinite loop of no-op work. Since `Payment.userId` is non-nullable in the schema, this branch is technically unreachable, but:
- Either drop the `string | null` from the signature (and remove the early return), or
- Still mark `bumpFulfilled: true` before returning so retries don't re-enter.

The current shape mixes "skip because owned (mark fulfilled)" with "skip because no user (don't mark fulfilled)" which is asymmetric.

### C2 — Cart UI shows pre-filter total, checkout silently uses post-filter total
**File:** `app/cart/page.tsx:65` vs `app/actions/cart.ts:88-97`

Cart page computes `totalVnd = orderedProducts.reduce(...)` over all cookie items (line 65) and renders that to the user. But `checkoutCartAction` filters owned non-sub items and recomputes a (possibly lower) total. So a user with A+B in cart, already owning A, sees "Tổng: 200k" but actually pays 100k. They get only B, no message about A being skipped.

**UX question for user:** is this desired ("checkout only what's new") or should the cart page itself filter the displayed list and total, OR should checkout reject the whole cart with `already_owned` and force the user to remove A manually?

Per task spec, you flagged this exact edge case as "note any concern". My recommendation: filter in the cart page render (line 38-40) so the displayed total matches what gets charged. Otherwise users will think they were overcharged.

### C3 — `addBumpToPaymentAction` does not block bump-equals-main-product
**File:** `app/actions/marketplace.ts:187-243`

If admin (or a malicious crafted request) sets a non-subscription product's `bumpProductId` to itself (or to a product already in the same payment's refId), the guard checks "already owned" but not "already in this payment". For the main-flow product purchase this is fine because the main Purchase is still PENDING (not COMPLETED yet), so `already_owned` returns false — and the user ends up paying for the same product twice in one transaction.

This isn't introduced by your change (it's a pre-existing edge), but the new guard sits next to it and may give a false sense of safety. Worth noting; out of scope to fix unless flagged.

### C4 — `simulatePaymentCompletedAction` does not handle cart refType
**File:** `app/actions/marketplace.ts:293-348`

The simulate path only branches on `product` and `challenge` (lines 321-332). Cart payments cannot be simulated — owner clicks "Simulate" on a cart Payment and nothing creates the Purchase rows (only the Payment row flips to COMPLETED). Again pre-existing, but if your test plan includes simulate-cart, it won't validate the new filter end-to-end.

---

## Nits

### N1 — Type signature inconsistency
**File:** `lib/services/payment.ts:55` vs callsites at 334, 352

Helper accepts `userId: string | null` but only one call passes raw `payment.userId` (line 334, no `!`) while the other uses `!` assertion (line 352). Since schema is non-nullable, prefer `userId: string` in the signature and let TS prove non-null at callsites. Removes the dead `if (!userId) return;` branch (see C1).

### N2 — `excludedIds` redundant Set wrap
**File:** `app/cart/page.tsx:53`

```ts
const excludedIds = Array.from(new Set([...productIds, ...ownedNonSubRows.map((r) => r.productId)]));
```

Prisma `notIn` deduplicates server-side; the `Set` is unnecessary overhead. `[...productIds, ...ownedNonSubRows.map(r => r.productId)]` is enough. Minor.

### N3 — `bumpSkipped: alreadyOwned || undefined` in JSON metadata
**File:** `lib/services/payment.ts:88`

```ts
data: { metadata: { ...meta, bumpFulfilled: true, bumpSkipped: alreadyOwned || undefined } },
```

JSON.stringify drops `undefined` keys, so this works, but it's a subtle idiom. If you want auditability of "we tried to fulfill but user already owned it", explicitly set `bumpSkipped: alreadyOwned` (boolean) — slightly more useful for debugging later. If you want to keep the key absent when not skipped, the current form is fine; just add a one-line comment.

### N4 — Detail-page redirect on `already_purchased` is a silent no-op for the user
**File:** `app/c/[slug]/marketplace/[productSlug]/page.tsx:113-115`

```ts
if (err.message === "already_purchased") {
  redirect(`/c/${communitySlug}/marketplace/${productSlug}`);
}
```

User clicks Buy → service throws → redirect back to same page → page renders the "✓ Bạn đã sở hữu" badge. The badge is the explanation, but there's no toast/banner saying "you already own this — refreshed". For a stale-tab UX, a query param + flash message would be friendlier. Defense-in-depth still holds; UX nit.

---

## Edge cases — verification per task spec

- **Cart with mix of owned + new**: silently checks out only new. See C2 — needs explicit UX decision.
- **Owner/admin preview mode**: `getEffectiveOwnership` in product detail page is independent of the guard. Preview owners can still hit Buy via the form action since they go through `startProductPurchase` like any user. If a preview-owner has a real Purchase row, they'll see the badge correctly. No interference observed.
- **Free product**: `startProductPurchase` throws `product_is_free` at line 107/109 BEFORE the new guard at line 113. Correct ordering preserved — free products never reach the guard.
- **Coupon pairing**: `resolveCoupon` runs at line 121, AFTER the guard at line 113. If guard fires, `already_purchased` is thrown and no `redeemCouponInTx` runs. Correct — coupon usage count is not consumed on a blocked re-purchase.
- **Idempotency of bump fulfillment**: confirmed via `bumpFulfilled` flag set in `fulfillBumpInTx` (line 88) regardless of whether Purchase was created. Race-safe within transaction. Caveat: see C1 for the null-user edge.
- **Subscription not blocked**: confirmed at every layer (`!product.isSubscription` checks at payment.ts:113, marketplace.ts:205, cart.ts:88, pay/page.tsx:51, cart/page.tsx:50, productSlug page:432). No layer accidentally blocks subscriptions.

---

## Positive Observations

- Guards are correctly ordered: cheap product lookup → `isFree` reject → owned check → coupon resolution → bank cfg → transaction. Fail-fast preserved.
- The `fulfillBumpInTx` helper deduplicates fulfillment logic across webhook product/challenge branches and simulate path. Good DRY without overgeneralization.
- `bumpFulfilled` flag pattern is the right idempotency primitive for this flow.
- UI defense-in-depth (badge + server catch + redirect) is layered correctly.
- Cart action returns `{ ok: false, reason: "already_owned" }` matching the established shape — no new error contract introduced.

---

## Recommended Actions (Priority Order)

1. **[Blocker]** Fix `refType === "cart"` webhook branch to skip duplicate Purchase creation (B1).
2. **[Concern]** Decide cart UI behavior for mixed owned+new (C2) — either filter at render or reject whole cart.
3. **[Concern]** Tighten `fulfillBumpInTx` signature to drop null-userId path (C1 + N1 together).
4. **[Nit]** Consider explicit `bumpSkipped: boolean` vs `|| undefined` for clarity (N3).
5. **[Nit]** Add flash-message UX for already-owned redirect (N4) — optional.

---

## Unresolved Questions

1. **UX direction for mixed cart** (C2): silently filter at checkout, filter at cart-render, or reject the whole cart and force manual removal?
2. **Is cart-refType simulate testing needed** (C4)? If yes, simulatePaymentCompletedAction needs a cart branch — but that's out of scope of this change.
3. **Bump-equals-main-product** (C3) — known pre-existing edge or worth a follow-up ticket?

---

## Re-review 2026-05-24

**Status: APPROVED**

### B1 — Cart webhook idempotency: FIXED
`lib/services/payment.ts:397-426`. Cart loop now (a) gates on `payment.userId` (outer `Array.isArray(meta.breakdown) && payment.userId`), (b) per-item fetches `isSubscription`, (c) for non-subs runs `tx.purchase.findFirst({userId, productId, status: "COMPLETED"})` and `continue` on hit. Subscriptions still re-create (renewal valid). Both failure modes from the original B1 (stale-cart cross-tab race, webhook redelivery) closed. The outer `payment.userId` guard is safe — `Payment.userId` is non-null in schema (`prisma/schema.prisma:667`), so this is belt-and-suspenders, not a skip path.

### C1 — `fulfillBumpInTx` signature: FIXED
`lib/services/payment.ts:55` now `userId: string`. Null early-return removed. Callsites verified:
- `payment.ts:333` (product branch) — passes `payment.userId` directly (clean)
- `payment.ts:351` (challenge branch) — still uses `payment.userId!` (redundant `!` post-schema, harmless — nit only)
- `marketplace.ts:336` (simulate) — passes `payment.userId` directly (clean)

### C2 — /cart total/charge consistency: FIXED
`app/cart/page.tsx:53-89`. `eligibleProducts` filter applied; `totalVnd` (line 69), header count (line 76), line-item map (line 94), and `CartCheckoutButton` (line 116) all use `eligibleProducts`. `skippedCount` notice renders at line 87-91 when > 0. "0 eligible left" gracefully degrades: button renders with `totalVnd=0`, and `checkoutCartAction` rejects with `total_zero`/`already_owned` — acceptable.

### Regression check
- Service guard (`payment.ts:112-118`): intact
- Cart action filter (`cart.ts:83-89`): intact
- addBump guard (`marketplace.ts:205-211`): intact
- Detail-page badge + catch + /pay hide layers: untouched

### Remaining (non-blocking)
- N1-equivalent: drop redundant `!` on `payment.ts:351` for cleanliness.
- C3, C4: pre-existing, out of scope, acknowledged.
- N3 `bumpSkipped: alreadyOwned || undefined`: unchanged, low priority.

Safe to ship.
