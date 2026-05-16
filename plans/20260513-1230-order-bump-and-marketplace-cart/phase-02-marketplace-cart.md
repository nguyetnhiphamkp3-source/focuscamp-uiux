# Phase 2 — Marketplace Cart

## Context Links

- Plan overview: `./plan.md`
- Phase 0 (magic link / guest checkout): `./phase-00-magic-link-auth.md`
- Phase 1 (bump + post-purchase helper): `./phase-01-order-bump.md`
- Marketplace page: `app/c/[slug]/marketplace/page.tsx`
- Product detail: `app/c/[slug]/marketplace/[productSlug]/page.tsx`
- Global marketplace: `app/(shell)/marketplace/page.tsx`
- Payment service: `lib/services/payment.ts`
- SePay helpers: `lib/sepay.ts`

## Overview

- **Priority:** P2
- **Status:** Pending
- **Effort:** ~4h
- **Description:** User Add-to-Cart nhiều products → cart icon ở header → /cart page → checkout → 1 Payment cho total → /pay/[code] → webhook fulfill tất cả Purchase rows. Supports **2 checkout modes**:
  1. **Logged-in checkout** (default) — session required, current behavior.
  2. **Guest checkout** (depends on Phase 0) — guest enters email → stub user upserted via `startGuestCheckoutAction` → after webhook, magic link emailed for activation.

## Key Insights

- **Cart = cookie-based** (signed, httpOnly): `fc_cart = JSON.stringify([{productId, qty}])`. KISS, đa số user mua trên 1 device, không cần cross-device sync.
- **No Cart/CartItem tables** — cart chỉ tồn tại đến lúc checkout. Tại checkout: server validate items, create 1 Payment + N Purchase rows.
- **N Purchases share 1 paymentCode** via `Purchase.paymentRef = paymentCode`. Webhook khi match → loop `purchase.updateMany({where: paymentRef = code, ...})`.
- **Payment.refType = "cart"** mới. refId = first purchase ID (anchor). `metadata.cart.purchaseIds = [id1, id2, ...]` để webhook biết loop nào.
- **Multi-community cart** OK — items có thể từ nhiều community, tất cả trỏ về 1 SePay account (focus.camp platform). Doanh thu attribution dùng `Purchase.product.communityId` như hiện tại.

## Requirements

### Functional
- "Add to Cart" button trên product detail + marketplace listing.
- Cart icon ở header (global marketplace + per-community marketplace) với badge số lượng.
- `/cart` page list items, edit qty, remove, total preview, checkout button.
- Checkout → create N Purchases + 1 Payment → redirect /pay/[code].
- Webhook → fulfill all purchases atomically + assign license keys for each LICENSE product.
- Empty cart sau khi checkout (clear cookie).
- Persist cart up to 30 days (cookie expiry).

### Non-functional
- Cart cookie max 5KB (browser limit ~4KB safe) — cap 20 distinct products.
- Stock validation tại checkout (not at add) — racing OK.
- Idempotent checkout: re-submit không tạo duplicate. Lock với `revalidatePath` and cookie-clear before redirect.

## Architecture

### Data flow — Add to cart

```
User on product detail → click Add to Cart
  → server action addToCartAction({productId})
  → read existing cookie, append/increment qty
  → set cookie (response.cookies.set)
  → revalidatePath(current page)
```

### Data flow — Checkout

```
User on /cart → click Checkout
  → server action checkoutCartAction()
  → read cookie items
  → in $transaction:
     1. Validate each productId exists, not isFree, has stock
     2. Compute total = sum(product.priceVnd * qty)
     3. Create N Purchase rows (status=PENDING, paymentRef=<placeholder>)
     4. Create 1 Payment:
        - refType="cart"
        - refId=purchases[0].id  (anchor; not strictly used)
        - amountVnd=total
        - metadata={ cart: { purchaseIds: [id1, id2, ...] } }
     5. Update each Purchase.paymentRef = payment.paymentCode
  → clear cart cookie
  → redirect /pay/<code>
```

### Data flow — Webhook fulfill cart

```
SePay webhook → matchSePayTransactionToPayment(code, total)
  → existing payment match logic OK
  → in $transaction (existing):
     a. Payment → COMPLETED
     b. NEW branch: if refType==="cart":
        - purchaseIds = metadata.cart.purchaseIds
        - tx.purchase.updateMany({ where: { id: { in: purchaseIds } }, data: { status: COMPLETED, paymentRef: transactionId } })
  → POST-tx: for each id, assignLicenseKey + convertReferralFromPurchase + notify (re-use existing single-product post-tx code via loop)
```

### Component interactions

```
CartCookie (lib/cart.ts) — read/write/parse helpers
  ↑                              ↑
AddToCartButton             CartIcon (badge)
  (product pages)            (marketplace headers)
  ↓                              ↓
addToCartAction        /cart page → CheckoutButton → checkoutCartAction
```

## Related Code Files

### To create
- `lib/cart.ts` — `getCart(cookies)`, `setCart(cookies, items)`, `addItem(items, productId)`, `removeItem`, `clearCart`, `validateCart(items)` (server-side stock/price hydration).
- `app/actions/cart.ts` — `addToCartAction`, `removeFromCartAction`, `updateCartQtyAction`, `checkoutCartAction`.
- `app/cart/page.tsx` — server component, lists items + CheckoutForm.
- `app/cart/checkout-form.tsx` — client component for checkout submit.
- `components/marketplace/add-to-cart-button.tsx` — client form posting action.
- `components/marketplace/cart-icon.tsx` — server component reading cookie count, renders Link to /cart with badge.

### To modify
- `lib/services/payment.ts` — extend `matchSePayTransactionToPayment` for `refType="cart"`. Refactor single-product post-tx side-effects into helper `runPostPurchaseSideEffects(purchaseId)` for reuse.
- `app/c/[slug]/marketplace/[productSlug]/page.tsx` — add `<AddToCartButton>` next to "Mua ngay".
- `app/c/[slug]/marketplace/page.tsx` — add `<CartIcon>` in header area.
- `app/(shell)/marketplace/page.tsx` — add `<CartIcon>` in header area.
- `components/marketplace/product-card.tsx` (optional) — add AddToCart on hover. Skip for v1.

### Untouched
- `lib/sepay.ts` — `createPayment` accepts `refType="cart"` (string field, no enum constraint in schema).
- `app/pay/[paymentCode]/page.tsx` — generic UI, works for any payment.

## Implementation Steps

1. **Cart cookie helpers** — `lib/cart.ts`:
   - Schema: `type CartItem = {productId: string; qty: number}`.
   - `getCart(): CartItem[]` — read from `cookies()` (Next 15 async API).
   - `setCart(items)` — write JSON, httpOnly=false (need client read for badge? — actually KEEP httpOnly=true and read server-side; client refetch via revalidatePath).
   - `addItem`, `updateQty`, `removeItem`, `clear`.
   - Max 20 items; max qty=10/item.
2. **Cart actions** — `app/actions/cart.ts`:
   - `addToCartAction({productId, qty=1})` — auth required (could allow guest later); validates product exists, not isFree; appends/increments.
   - `removeFromCartAction({productId})`.
   - `updateCartQtyAction({productId, qty})`.
   - `checkoutCartAction()` — full transaction (see data flow above). Returns `{ok: true, paymentCode}` or error.
3. **Cart icon** — `components/marketplace/cart-icon.tsx` — server component, reads cookie, renders `<Link href="/cart">🛒 {count}</Link>`. Hides if empty.
4. **AddToCart button** — `components/marketplace/add-to-cart-button.tsx` — client, form action calls addToCartAction, shows "✓ Added" feedback (useTransition).
5. **/cart page** — `app/cart/page.tsx`:
   - Read cookie → hydrate via `validateCart` (fetch product titles, current prices, deduct removed items).
   - Render table: thumbnail | title | price | qty selector | remove btn.
   - Show total.
   - If `session?.user` → render `<CheckoutForm>` (calls `checkoutCartAction`).
   - If no session → render `<GuestCheckoutForm>` (from Phase 0) — email input + "Pay as guest" button → calls `startGuestCheckoutAction`.
   - Both paths redirect to /pay/[code] on success.
   - Empty state if no items.
6. **Marketplace integration**:
   - Per-community marketplace (`app/c/[slug]/marketplace/page.tsx`) — add `<CartIcon>` inside `.mk-section-head` or top-right.
   - Global marketplace (`app/(shell)/marketplace/page.tsx`) — same.
   - Product detail page — add AddToCart button BESIDE "Mua ngay" (not replacing).
7. **Payment service refactor** (skip if Phase 1 already done):
   - Extract single-product side-effects (license + referral + notify + gettime CRM) into `lib/services/purchase-fulfillment.ts > runPostPurchaseSideEffects(purchaseId)`. **Phase 1 also needs this extraction — whichever phase ships first does it; the other reuses.**
   - Existing `if refType==="product"` calls this helper.
   - New `if refType==="cart"` loops purchaseIds, calls helper for each.
8. **Webhook extension** — in `matchSePayTransactionToPayment`:
   ```ts
   } else if (payment.refType === "cart") {
     const ids: string[] = (payment.metadata as any)?.cart?.purchaseIds ?? [];
     await tx.purchase.updateMany({
       where: { id: { in: ids } },
       data: { status: "COMPLETED", paymentRef: transactionId },
     });
   }
   ```
   POST-tx: `for (const id of ids) await runPostPurchaseSideEffects(id);`
9. **Smoke test** — add 3 products (1 LICENSE, 1 TEMPLATE, 1 SOP) to cart, checkout, simulate webhook, verify all 3 Purchase COMPLETED + license key assigned to LICENSE product.

## Todo List

- [ ] Create `lib/cart.ts` with cookie helpers
- [ ] Create `app/actions/cart.ts` with add/remove/update/checkout (logged-in path)
- [ ] Wire `<GuestCheckoutForm>` (from Phase 0) into `/cart` for no-session users
- [ ] Create `components/marketplace/cart-icon.tsx`
- [ ] Create `components/marketplace/add-to-cart-button.tsx`
- [ ] Create `app/cart/page.tsx` + `checkout-form.tsx`
- [ ] Extract `lib/services/purchase-fulfillment.ts > runPostPurchaseSideEffects`
- [ ] Refactor existing single-product webhook branch to use helper
- [ ] Add cart branch (`refType === "cart"`) to webhook handler
- [ ] Mount `<CartIcon>` in per-community marketplace header
- [ ] Mount `<CartIcon>` in global marketplace header
- [ ] Add `<AddToCartButton>` on product detail page
- [ ] Smoke test: 3-item cart → checkout → webhook → 3 COMPLETED
- [ ] Update `docs/competitor-analysis.md` (Whop/Skool parity: cart)

## Success Criteria

- [ ] User adds 3 distinct products to cart, sees badge "3" in marketplace header.
- [ ] /cart page shows correct titles, prices, qtys, and accurate total.
- [ ] Removing an item updates total without losing other items.
- [ ] Checkout creates 1 paymentCode + 3 Purchase rows in PENDING.
- [ ] /pay page shows total = sum of products.
- [ ] Webhook → all 3 Purchase COMPLETED, license key generated for LICENSE-type item.
- [ ] Cart cookie cleared after checkout.
- [ ] External notify channel receives 3 purchase events (one per item).
- [ ] Affiliate referral converts for each Purchase if applicable.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Cookie size > 4KB | Low | High | Cap 20 items, qty 1-10. Validate at write. |
| Stock changes between add and checkout | Medium | Low | Validate at checkout in transaction; remove out-of-stock items + error message. |
| User double-clicks Checkout | Medium | Medium | useTransition + button disable; server-side: action checks `cart.length > 0`, clears cookie BEFORE Payment create. |
| Partial fulfillment fails mid-loop | Low | High | $transaction wraps all Purchase updates; updateMany is atomic. Post-tx side effects (license, notify) per-item — if one fails, others still succeed; log warnings (existing pattern). |
| Webhook double-fires | Low | High | Existing `status !== PENDING` guard prevents reprocessing. |
| Cart includes free products | Low | Low | Validate in addToCartAction: reject if isFree. |
| Cross-community product mix breaks community-attribution | Medium | Low | Notifications already use `product.communityId` per-purchase — works correctly. |
| Cart cookie tampered (qty=999) | Low | Medium | Re-validate qty cap server-side at checkout. Price hydrated from DB (cookie has no price). |

## Security Considerations

- Cart cookie httpOnly + same-site Lax. No price stored in cookie (server hydrates from DB).
- `checkoutCartAction` — auth required; user must be member of each product's community (existing rule).
- Prevent CSRF — Next 15 server actions use built-in CSRF protection.
- Rate limit `addToCartAction` (60/min/user via existing `lib/rate-limit.ts`).

## Backwards Compatibility

- Existing "Mua ngay" flow on product detail untouched.
- Existing single-product Purchase / Challenge / Subscription webhook flow untouched.
- New `Payment.refType = "cart"` is additive — no enum constraint to alter.
- Cart cookie only set after user explicitly adds — anonymous users unaffected.

## Next Steps

- Future: server-side cart (DB-backed) for cross-device sync — requires Cart + CartItem tables.
- Future: discount codes at cart level (separate plan).
- Future: cart abandoned email reminders (cron + telegram bot).
- **Cross-link with Phase 1 (bump):** if cart has items from ONE community AND that community has `bumpProductId` → show bump on /pay. For multi-community carts: set `Payment.communityId = null` and skip bump display for v1.
- **Cross-link with Phase 0 (auth):** guest checkout flow uses `startGuestCheckoutAction` from Phase 0; activation email triggered post-webhook via `sendActivationMagicLink`. /cart must render `<GuestCheckoutForm>` when `!session`.
