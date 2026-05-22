# Code Review — Per-Community Coupon System

Date: 2026-05-22 | Reviewer: code-reviewer | Branch: main (uncommitted)
Plan: `plans/260522-2247-coupon-system/plan.md`

## Scope
- Service + DB: `lib/services/coupon.ts`, `lib/services/payment.ts`, `lib/sepay.ts`, `prisma/schema.prisma`, migration SQL
- Actions: `app/actions/coupon.ts`, `coupons-admin.ts`, `cart.ts`, `challenge-review.ts`
- UI: `coupon-input.tsx`, `buy-with-coupon.tsx`, `join-with-coupon.tsx`, settings pages, form
- Permissions: `lib/community-permissions.ts`

Overall: solid design, clean separation, KISS-compliant. Webhook idempotency + permission gates are correct. **Main weakness is non-atomic Payment+Redemption insert** — recoverable but observable.

---

## Critical

### C1. Non-atomic Payment + CouponRedemption insert (lib/services/payment.ts:90-117, app/actions/cart.ts:125-154)
`createPayment()` is called via `prisma.payment.create()` directly, then `redeemCouponInTx(prisma, ...)` runs as a separate top-level statement. If the redemption insert fails (DB blip, FK violation, conn drop) after Payment is committed, the user receives discounted QR but no redemption row exists. Consequences: (a) counts under-count, (b) per-user limit bypassable by triggering insert failure, (c) coupon `bumpFulfilled`-style replay impossible.

**Fix:** Wrap both inserts in `prisma.$transaction(async (tx) => { ... })`. Refactor `createPayment()` to accept optional `tx` (or inline inside the txn). Same applies to `startProductPurchase` (uses `.then(...)` chaining outside the initial `$transaction` — see line 74), `startChallengePurchase` (lines 153-180), and `checkoutCartAction` (lines 125-154).

Note: `startProductPurchase` creates Purchase row inside one transaction, then does coupon resolve + payment + redemption sequentially outside — three independent writes. Worst case: Purchase exists, no Payment, no Redemption → stale `PENDING` purchase.

### C2. `startProductPurchase` does not validate community membership before purchase (lib/services/payment.ts:47-73)
Old behavior or new? Function does not check that user is a member of `product.communityId` before creating Purchase. The page-level guard exists in `marketplace/[productSlug]/page.tsx` but agentic / API entry paths bypass it. **Out of coupon scope** — flagging because the coupon code can be applied across communities this way (the validateCoupon rejects mismatches, but Purchase row still gets created without coupon). Confirm intent.

---

## High

### H1. Coupon redemption count race window (lib/services/coupon.ts:101-125)
`validateCoupon` counts redemptions via `prisma.couponRedemption.count()` then the caller inserts a new row — two queries, no lock. Under burst (N concurrent checkouts), `maxRedemptions` can be exceeded by ~N-1. The unique constraint on `paymentId` does NOT prevent this — different payments, different rows.

Mitigation in current code: per-payment 30-min TTL means burst over-allocation auto-corrects. Acceptable IF coupon owners understand "max 10 uses ≈ 10±2 in burst". **Recommend documenting this in the admin UI** ("Số lượt tối đa có thể bị vượt 1-2 trong lúc đông"). For strict guarantees: add `tx.$executeRaw\`SELECT 1 FROM "Coupon" WHERE id=$1 FOR UPDATE\`` inside the redemption transaction.

### H2. Webhook redemption update isn't idempotent on retry (lib/services/payment.ts:251-256)
The inner transaction uses `updateMany` with `status: "PENDING"` filter — if webhook fires twice, second call updates 0 rows (idempotent ✓). However, **if the redemption was somehow `CANCELLED` before webhook arrived** (e.g., user hit `getPaymentStatus` after expire just before transfer), the `updateMany` won't revive it. Payment becomes COMPLETED but redemption stays CANCELLED. Counts under-report. 
**Mitigation:** Filter `status: { in: ["PENDING", "CANCELLED"] }` — if webhook arrived, redemption belongs to the completed payment regardless of prior status.

### H3. `getPaymentStatus` mutation in a "GET" function (lib/services/payment.ts:185-206)
This function performs writes (Payment update + CouponRedemption update) inside what callers likely treat as a read. Two concurrent reads on an expired payment trigger two updates. The Payment update is idempotent because filter `where: { paymentCode }` always hits — but the redemption updateMany triggers twice (still idempotent on result but produces double `UPDATE` log lines). Acceptable but consider extracting to `expirePayment()` for clarity. **Bigger concern:** function is called from any page render → adds DB write to every page load. Verify it's only called from `/pay/[paymentCode]` polling — broad usage = surprise write traffic.

### H4. `coupon` field in `createPayment()` data spread order (lib/sepay.ts:104-110)
The conditional spread `...(params.coupon && { ... })` works correctly with Prisma's `Decimal` coercion of Number values. Prisma accepts JS number for Decimal cols. However, **`originalAmountVnd`/`discountVnd` are stored as `Decimal` while inputs are `number`** — fine at insert, but reading them returns Prisma Decimal objects. Verify all reads use `Number(payment.discountVnd)` — quick grep shows webhook handler does not currently read these fields, but any UI that displays "Giảm: X đ" will need the cast. Not a bug today; trap for tomorrow.

---

## Medium

### M1. Race: `validateCoupon` cannot detect inactive-flip during in-flight checkout
Admin toggles `isActive=false` between user's apply-preview and submit. UI shows applied state; server re-validate catches it and returns `coupon_invalid:inactive`. Form action throws / redirects to error. UI does NOT clear `applied` state — user sees their applied banner persisting after a fresh page load won't happen because the redirect carries `?couponError=inactive`. Verify the page reads that query param and surfaces the error. **Status:** not seeing the consumer of `couponError` query param in product/challenge pages — error is silently lost on redirect.

### M2. `parseInt` accepts decimals + NaN silently (components/settings/coupons/coupon-form.tsx:93-102)
`parseInt(percentage * 100)` → if user types "20.5", `Math.round(20.5 * 100) = 2050` (correct), but `parseInt("abc")` → NaN → server rejects via zod's `int()`. Good. **However**: `fixedAmountVnd` input `<input type="number" min="1">` doesn't enforce integer at HTML level; if user types "1500.5", `parseInt("1500.5", 10)` = 1500 silently — loss of 0.5. VND-only so impact negligible, but consider `Math.floor(parseFloat(...))` for honesty + add `step="1"`.

### M3. `perUserLimit` validation off-by-one risk (lib/services/coupon.ts:114-125)
Comment says "Mỗi user dùng tối đa 1" but the count includes PENDING. Scenario: user clicks Buy → PENDING redemption created → payment expires → user clicks Buy again. The first redemption is `CANCELLED` (via `getPaymentStatus`) so the `status: { in: ["PENDING", "COMPLETED"] }` filter excludes it → user can retry ✓. **Edge case:** if user never visits `/pay/[code]` after expiry and redemption stays PENDING past `expiresAt`, the per-user limit blocks retry. Need a cron/background job to flip stale PENDING redemptions to CANCELLED. **Mitigation suggestion:** `validateCoupon` could JOIN against Payment.expiresAt and exclude stale-PENDING redemptions in the count.

### M4. `renewChallengePaymentAction` does not carry coupon (challenge-review.ts:629-677)
When user renews a expired challenge payment, the new Payment is created without coupon. Original coupon discount is lost. Probably intentional (penalty for missing window + late fee) but **the original redemption stays as CANCELLED forever** while user actually completed the challenge via the renewal. Counts: legit user, no redemption credit. Acceptable; just document.

### M5. Cart bump + coupon interaction (payment.ts:262-277, 339-355)
Cart path does not currently support bump (the bump fulfillment branches only fire under `refType === "product"` / `"challenge"`). Looking at `checkoutCartAction`, no `bumpProductId` is written into metadata, and `refType === "cart"` branch processes `breakdown` items only. **So coupon + bump can't double-apply on cart** ✓. For product-path: coupon applies only to `product.priceVnd` (input to `startProductPurchase.effectiveAmountVnd`) — bump price is in metadata, not in `originalAmountVnd`, so coupon math never sees bump. ✓ Confirmed safe.

### M6. `delete coupon` blocked when redemptions exist, but allows delete with only CANCELLED (coupons-admin.ts:143-151)
`count({ where: { couponId }})` counts all statuses including CANCELLED. So a coupon with 50 cancelled redemptions can't be deleted — only soft-toggled. This is what the user wants per plan ("audit trail"), but UI shows "Xoá" button hidden only when `redemptionsUsed > 0` and `redemptionsUsed` is the active count (PENDING+COMPLETED only). UI shows delete button, server rejects with confusing error. **Fix:** pass `totalRedemptionsIncludingCancelled` to row actions, or change server to allow delete when no PENDING/COMPLETED.

### M7. Permission helper duplicated 4× (coupons-admin.ts:12-38 + 3 pages)
Each settings page rolls its own `requireCouponManager` logic. DRY violation. Extract `requireCommunityPermission(slug|id, permission)` to `lib/community-permissions.ts`. Not blocking.

---

## Low

### L1. Vietnamese reject labels missing `unauthorized` / `invalid_input` (coupon.ts:166-179)
`COUPON_REJECT_LABELS` typed against `CouponRejectReason` but `applyCouponAction` returns extra reasons (`unauthorized`, `invalid_input`) that bypass it. Server hardcodes the message instead. Inconsistent. Consider extending the type.

### L2. Coupon code regex allows numeric-only codes (validations.ts:516)
`/^[A-Z0-9]+$/` allows "12345" — fine UX-wise, just noting.

### L3. `CouponInput` doesn't auto-revalidate when `orderAmountVnd` changes (coupon-input.tsx)
If parent cart changes (item removed via `RemoveCartItemButton`), the `applied` state in `CartCheckoutButton` carries stale `discountVnd`/`finalAmountVnd`. The server re-validate at submit catches it (recomputes based on actual total), but the UI displays wrong "Sau giảm giá" line until checkout. **Mitigation:** add `useEffect` watching `orderAmountVnd` → call `onClear()` to force re-apply. Or display `applied.discountVnd` as informational only and recompute from current `orderAmountVnd`.

### L4. `prisma.coupon.findUnique` uses composite key but `validateCoupon` also re-checks `coupon.communityId === input.communityId` (coupon.ts:74-86)
Redundant — `findUnique({ communityId_code })` already constrains to one community. Dead branch. Harmless.

### L5. `effectiveAmountVnd` shadowing in `startProductPurchase` (payment.ts:62)
Parameter named `effectiveAmountVnd` while comment says "override from pricingConfig". Coupon path uses `originalAmountVnd = effectiveAmountVnd ?? product.priceVnd`. Naming hints at member-tier pricing logic that isn't here. Document or rename.

---

## Positive

- Architecture decision (validate-before-Payment) is genuinely good — eliminates the race the plan called out
- Webhook handler addition is correctly inside existing transaction
- Migration is additive + nullable as required
- Permission gate `manage_coupons` properly hangs off existing matrix
- Input validation via zod everywhere (good)
- `COUPON_REJECT_LABELS` keyed against typed union — compile-time exhaustiveness ✓
- Hard-delete blocked when redemptions exist (audit trail preserved)
- `paymentId @unique` correctly prevents double-spend on same payment

---

## Recommended actions (priority order)

1. **C1**: Wrap Payment+Redemption in single transaction (3 services: product, challenge, cart). ~30 min.
2. **H2**: Webhook redemption status filter — include CANCELLED. ~5 min.
3. **M3**: Add background job (or inline in validate) to flip stale-PENDING redemptions to CANCELLED past `Payment.expiresAt`. ~20 min.
4. **M1**: Surface `?couponError=` query param on entry pages. ~15 min per page.
5. **M6**: Sync delete UI with server (count includes CANCELLED) — either change rule or change count. ~5 min.
6. **L3**: Auto-clear applied coupon on cart total change. ~5 min.

---

## Metrics
- Files reviewed: 17 (~1.6k LOC of new code)
- Type coverage: high (zod + strict union types throughout)
- Critical bugs: 1 (C1) — recoverable but observable in audit
- High-severity: 4

---

## Unresolved questions

1. **C1 fix scope:** Refactor `createPayment()` to accept optional `tx`, or duplicate transaction wrapping in each caller? The 5+ existing callers (subscription, community plan, event) don't need coupons but would benefit from atomic refType-specific writes. Bigger refactor — confirm scope.
2. **H1 strictness:** Is "max 10 uses ≈ 10±2 in burst" acceptable, or is strict ceiling required? If strict → need `SELECT ... FOR UPDATE` or Serializable isolation.
3. **C2:** Is membership check intentionally skipped in `startProductPurchase`? Page guards exist but service is the actual security boundary.
4. **M3 background job:** Does the project have a cron/scheduler infrastructure? Or should stale-PENDING be reaped lazily on every validate call?

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Coupon system architecture is sound; webhook integration + permission model are correct; main issue is non-atomic Payment+Redemption insert (C1) which can leak counts under DB failures.
**Highest-priority concerns:**
1. **C1** — Payment and CouponRedemption write outside a shared transaction; failure between them produces an untracked discount.
2. **H2** — Webhook redemption update misses CANCELLED→COMPLETED transition path; under-reports counts in a narrow race.
3. **M3** — Stale `PENDING` redemptions past `expiresAt` block legitimate user retries unless `getPaymentStatus` is polled.
