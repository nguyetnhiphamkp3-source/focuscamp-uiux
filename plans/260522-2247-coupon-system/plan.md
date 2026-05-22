# Per-Community Coupon System — Implementation Plan

## Context

focus.camp có 6 loại checkout dùng chung trang QR `/pay/[paymentCode]` (SePay VietQR). User
muốn thêm ô **nhập mã coupon giảm giá** ở mọi entry point checkout, không phụ thuộc vào việc
QR đã render hay chưa.

**Vấn đề kỹ thuật chính:**
QR là URL public của vietqr.io chứa `?amount=X&addInfo=PAYMENTCODE`. Webhook SePay match
giao dịch bằng `paymentCode` (memo) + `amountVnd` exact (sai số <0.01) — xem
[lib/services/payment.ts:115-139](lib/services/payment.ts#L115-L139). Nếu apply coupon sau
khi QR đã hiện sẽ tạo race: user có thể chuyển khoản với amount cũ trong khi DB đã update
amount mới → webhook mismatch → tiền treo.

**Giải pháp:**
Đặt ô coupon **TẠI ENTRY POINT UI**, validate + apply **TRƯỚC khi gọi `createPayment()`**.
Payment được tạo với `amountVnd` đã giảm sẵn → QR luôn render đúng số final → webhook
không cần thay đổi gì → không có race.

**Out of scope v1:**
- Coupon entry tại trang `/pay/[paymentCode]` (chỉ hiện link "Có coupon? Bấm Huỷ → checkout lại")
- Coupon cho `subscription` + `community` plan upgrade (platform-level revenue, không phải community-to-user)
- Coupon trong `challenge-review` flow ([app/actions/challenge-review.ts:533](app/actions/challenge-review.ts#L533)) — admin-initiated, không phải user checkout
- Stacking nhiều coupon
- Coupon FREE 100% (cần bypass payment flow riêng)
- Trang public list coupon active
- Bulk import / analytics dashboard

## Scope decisions (đã chốt với user)

| Field | Quyết định |
|---|---|
| Owner | Community owner (per-community). Coupon thuộc 1 community, chỉ apply cho item của community đó. |
| Discount type | PERCENTAGE (có `maxDiscountVnd` cap optional) HOẶC FIXED (VND). 1 coupon = 1 type. |
| validFrom / validUntil | Nullable timestamps. Null = unbounded. |
| maxRedemptions | Nullable int. Null = unlimited. |
| perUserLimit | Int, default 1. |
| allowedRefTypes | Array string: `["product", "challenge", "cart", "event"]`. |
| Stacking | KHÔNG. 1 coupon/order. Nhập mã mới = thay mã cũ. |
| Permission | Thêm permission mới `manage_coupons` vào [lib/community-permissions.ts](lib/community-permissions.ts) — gán cho OWNER + ADMIN. |
| Public listing | Không trong v1. |
| Rounding | `Math.floor` discount (favors platform — user nhận discount tròn xuống). VND không có thập phân. |

## Architecture overview

```
[Entry Point UI: product page / challenge page / /cart / event page]
        │
        │ user types code + clicks "Áp dụng"
        ▼
  applyCouponAction(code, context)  ◄── new server action
        │
        │ validate via validateCoupon() — checks expiry, redemptions, user limit, refType, min order, community match
        │ return { ok, discountVnd, finalAmountVnd, coupon }
        ▼
  UI shows breakdown: original / discount / final
        │
        │ user clicks "Thanh toán"
        ▼
  startProductPurchase() | startChallengePurchase() | checkoutCartAction() | startEventPurchase()
        │
        │ pass couponId + discountVnd through to createPayment()
        ▼
  Payment created with amountVnd = finalAmountVnd
  CouponRedemption row created (status PENDING, linked to paymentId)
        │
        ▼
  QR renders with finalAmountVnd  ◄── no change to QR rendering
        │
        │ user transfers exact amount
        ▼
  SePay webhook → matchSePayTransactionToPayment()
        │
        ▼
  Payment → COMPLETED
  CouponRedemption → COMPLETED (atomic update in same transaction as webhook match)
```

## Phases

### Phase 1 — Schema + migration

**Files to add/edit:**
- [prisma/schema.prisma](prisma/schema.prisma#L655-L676) — add 2 tables + 4 nullable cols on Payment

**New tables:**

```prisma
model Coupon {
  id                String    @id @default(cuid())
  communityId       String
  code              String    // human-readable, normalized uppercase
  discountType      String    // "PERCENTAGE" | "FIXED"
  percentageBps     Int?      // basis points: 2000 = 20.00% (avoid float)
  maxDiscountVnd    Decimal?  @db.Decimal(15, 2)   // optional cap when PERCENTAGE
  fixedAmountVnd    Decimal?  @db.Decimal(15, 2)   // required when FIXED
  minOrderVnd       Decimal?  @db.Decimal(15, 2)   // optional floor
  validFrom         DateTime?
  validUntil        DateTime?
  maxRedemptions    Int?      // null = unlimited
  perUserLimit      Int       @default(1)
  allowedRefTypes   String[]  // ["product","challenge","cart","event"]
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  community         Community @relation(fields: [communityId], references: [id])

  @@unique([communityId, code])
  @@index([communityId, isActive])
}

model CouponRedemption {
  id           String   @id @default(cuid())
  couponId     String
  userId       String
  paymentId    String   @unique           // 1 payment = at most 1 redemption
  discountVnd  Decimal  @db.Decimal(15, 2)
  status       String   @default("PENDING") // PENDING → COMPLETED on webhook match, CANCELLED on payment expire
  createdAt    DateTime @default(now())
  completedAt  DateTime?
  coupon       Coupon   @relation(fields: [couponId], references: [id])
  user         User     @relation(fields: [userId], references: [id])
  payment      Payment  @relation(fields: [paymentId], references: [id])

  @@index([couponId, status])
  @@index([userId, couponId])
}
```

**Payment additions** (additive, all nullable — safe rollback):
- `originalAmountVnd Decimal? @db.Decimal(15, 2)` — pre-discount total
- `discountVnd Decimal? @db.Decimal(15, 2)` — discount applied
- `couponId String?`
- `couponCode String?` — denormalized for display

Migration: `pnpm prisma migrate dev --name add_coupon_system`. Deploy: `prisma migrate deploy`
trong container (per AGENTS.md DB management section).

### Phase 2 — Service layer + validation

**Files to create:**
- `lib/services/coupon.ts` — core logic

**Functions:**

```ts
// Pure validation, no side effects. Used to preview discount in UI.
validateCoupon(input: {
  code: string;
  communityId: string;
  userId: string;
  refType: "product" | "challenge" | "cart" | "event";
  orderAmountVnd: number;
}): Promise<
  | { ok: true; coupon: Coupon; discountVnd: number; finalAmountVnd: number }
  | { ok: false; reason: CouponRejectReason }
>;

// Atomic: validate + create CouponRedemption row + return discount.
// Called from checkout services (Phase 4) inside the same DB transaction
// that creates Payment.
redeemCouponInTx(tx, input: {
  couponId: string;
  userId: string;
  paymentId: string;
  discountVnd: number;
}): Promise<void>;
```

**Reject reasons (typed enum):**
`not_found | inactive | expired | not_yet_valid | reftype_not_allowed |
community_mismatch | max_redemptions_reached | per_user_limit_reached |
min_order_not_met | already_consumed`

**Files to edit:**
- [lib/validations.ts](lib/validations.ts) — add `couponCodeSchema` (uppercase, alphanumeric, 3-32 chars)
- [lib/community-permissions.ts:11-26](lib/community-permissions.ts#L11-L26) — add `"manage_coupons"` permission; grant to OWNER + ADMIN

**Race safety:** wrap counter check + redemption insert in `prisma.$transaction` with
`Serializable` isolation. `CouponRedemption.paymentId @unique` prevents double-spend on
same payment.

### Phase 3 — Shared `<CouponInput>` component

**Files to create:**
- `components/checkout/coupon-input.tsx` — client component

**Behavior:**
- Props: `{ communityId, refType, orderAmountVnd, onApply: (result) => void, onClear: () => void }`
- Input box + "Áp dụng" button
- Calls `applyCouponAction()` (server action) → shows discount preview or error message
- Vietnamese error labels mapped from reject reasons
- "Xoá mã" button when applied
- Disabled state during pending request

**Files to create:**
- `app/actions/coupon.ts` — `applyCouponAction()` (wraps `validateCoupon()`, returns serializable result)

### Phase 4 — Integrate into 4 checkout entry points

For each entry point: render `<CouponInput>` above the "Thanh toán" button. On apply,
store `couponId` + `discountVnd` in component state. Pass to service call.

**Files to edit:**

| Checkout | UI file | Service to update |
|---|---|---|
| Product | [app/c/[slug]/marketplace/[productSlug]/page.tsx:85](app/c/[slug]/marketplace/[productSlug]/page.tsx#L85) (purchase flow) | [lib/services/payment.ts:12](lib/services/payment.ts#L12) `startProductPurchase()` |
| Challenge | [app/c/[slug]/challenges/[challengeSlug]/page.tsx](app/c/[slug]/challenges/[challengeSlug]/page.tsx) (join button) | [lib/services/payment.ts:60](lib/services/payment.ts#L60) `startChallengePurchase()` |
| Cart | [app/cart/checkout-button.tsx](app/cart/checkout-button.tsx) + `/cart` page | [app/actions/cart.ts:50](app/actions/cart.ts#L50) `checkoutCartAction()` |
| Event | (locate event signup UI during impl) | [lib/services/event.ts:207](lib/services/event.ts#L207) |

**Service signature changes** (additive optional params):

```ts
startProductPurchase({ userId, productId, couponId?, discountVnd? })
startChallengePurchase({ userId, challengeId, couponId?, discountVnd? })
checkoutCartAction({ couponId?, discountVnd? })  // (productIdsOverride remains)
```

**Inside each service:**
1. Re-validate coupon server-side (don't trust client `discountVnd`) — call `validateCoupon()` again
2. Wrap in `prisma.$transaction`:
   - Create Payment with `amountVnd = finalAmountVnd`, fill `originalAmountVnd`, `discountVnd`, `couponId`, `couponCode`
   - Call `redeemCouponInTx()` to insert CouponRedemption row (status PENDING)

**Webhook update** ([lib/services/payment.ts:141-153](lib/services/payment.ts#L141-L153)):
- Inside existing webhook transaction, if `payment.couponId` set → update
  `CouponRedemption.status = "COMPLETED"`, `completedAt = now()`.
- On payment expire/cancel (existing cleanup) → set redemption `CANCELLED`.

### Phase 5 — Admin UI at `/c/[slug]/settings/coupons`

**Files to create:**
- `app/c/[slug]/settings/coupons/page.tsx` — list view (table)
- `app/c/[slug]/settings/coupons/new/page.tsx` — create form
- `app/c/[slug]/settings/coupons/[id]/page.tsx` — edit + redemption stats
- `app/actions/coupons-admin.ts` — `createCoupon`, `updateCoupon`, `deactivateCoupon`

**Permission gate:** every page + action checks `canCommunity(role, "manage_coupons")`.

**List view columns:** code, discount (formatted "-20%" or "-50.000đ"), validUntil,
redemptions used/max, isActive toggle, edit link.

**Create form fields:** code (uppercased on blur), discount type radio → conditional
fields (% + cap OR fixed amount), validFrom, validUntil, maxRedemptions, perUserLimit,
allowedRefTypes multi-checkbox, minOrderVnd.

**Add link in settings sidebar:**
- [app/c/[slug]/settings](app/c/[slug]/settings) — add "Mã giảm giá" entry guarded by `canManageCoupons`

### Phase 6 — Tests + edge cases

**Test files:**
- `__tests__/coupon-validation.test.ts` — all 10 reject reasons
- `__tests__/coupon-redemption-race.test.ts` — concurrent redemption, `maxRedemptions` enforcement
- `__tests__/checkout-with-coupon.test.ts` — e2e: apply → create Payment → simulate webhook → assert COMPLETED + redemption COMPLETED

**Edge cases to verify manually:**
1. Apply coupon, then change cart items — coupon should re-validate (orderAmount changed)
2. Order bump + coupon — bump amount should be discount-eligible? **Decision: NO. Coupon applies to original cart only. Bump is full-price upsell.** Document in code.
3. Payment expires → redemption auto-cancels via existing expire cleanup
4. Free challenge (no `priceVnd`) → coupon UI hidden (no checkout exists)
5. Same code uppercased — `code` stored uppercase, validation normalizes input

## Critical files reference (reuse, don't recreate)

- [lib/sepay.ts:54-106](lib/sepay.ts#L54-L106) — `createPayment()` — extend to accept coupon fields
- [lib/services/payment.ts:115-356](lib/services/payment.ts#L115-L356) — webhook matcher — add redemption completion
- [lib/community-permissions.ts:79](lib/community-permissions.ts#L79) — `canCommunity()` — reuse for guards
- [lib/community-config.ts](lib/community-config.ts) — `getPaymentConfig()` — unchanged
- [lib/cart.ts](lib/cart.ts) — cart cookie parsing — unchanged
- [app/cart/checkout-button.tsx](app/cart/checkout-button.tsx) — replace inline button with form that includes `<CouponInput>` then submit

## Verification (end-to-end)

1. **DB migration runs clean**: `pnpm prisma migrate dev` — no warnings, generated client has new types
2. **Type check passes**: `pnpm tsc --noEmit`
3. **Create a coupon via UI**: as community owner → `/c/<slug>/settings/coupons/new` → fill `TEST20`, 20%, allowedRefTypes=[product], validUntil=+7d, maxRedemptions=10
4. **Apply at checkout**: as member → product page → enter `TEST20` → see discount preview → click Thanh toán → land on `/pay/<code>` → QR shows amount × 0.80
5. **Webhook simulation**: trigger `/api/sepay/webhook` with matching `paymentCode` + discounted amount → Payment becomes COMPLETED → CouponRedemption becomes COMPLETED
6. **Limit enforcement**: 11th redemption attempt → reject with `max_redemptions_reached`
7. **Per-user limit**: same user 2nd attempt → reject with `per_user_limit_reached`
8. **Cross-community reject**: try `TEST20` on a product from another community → reject with `community_mismatch`
9. **Expire path**: create Payment with coupon, let it expire (or trigger manually) → CouponRedemption status = CANCELLED → user can redeem again (within limits)

## Risk register

| Risk | Mitigation |
|---|---|
| Concurrent redemption exceeds `maxRedemptions` | Serializable tx + unique `CouponRedemption.paymentId` |
| User trusts client-provided `discountVnd` | Server always re-validates inside checkout service |
| Coupon + order bump = discounted bump | Apply coupon only on cart base total, bump full price; documented in [lib/services/payment.ts:159-174](lib/services/payment.ts#L159-L174) |
| Race: apply coupon then change cart | UI re-validates on every cart change; on submit server re-validates |
| SePay 1000-VND-floor clamp | If `finalAmountVnd < 1000`, reject `min_amount_after_discount` — handle in `validateCoupon()` |
| Migration on prod blocks rollback | All new cols nullable, new tables additive — rollback safe |

## Master rollback switch

Env var `FEATURE_COUPON_ENABLED=false` (default true) — when false, `<CouponInput>`
returns null and `validateCoupon()` returns `{ok:false, reason:"feature_disabled"}`.
Lets us hide UX without redeploying schema.

## Open questions (decide during impl — not blockers)

1. **Code charset & length** — recommend `[A-Z0-9]{4,32}` uppercase auto-normalized. Confirm during Phase 5 form design.
2. **Soft-delete vs hard-delete coupon** — recommend hard-delete blocked if any redemption exists (keep audit trail); use `isActive=false` to retire. Confirm during Phase 5.
3. **Display format** for percentage in UI — "-20%" with `percentageBps / 100`. OK?
4. **Vietnamese label set** for all 10 reject reasons — draft during Phase 3 component.
