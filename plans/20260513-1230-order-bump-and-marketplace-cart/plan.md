---
title: "Magic Link Auth + Per-Product Order Bump/Upsell + Marketplace Cart"
description: "Passwordless guest checkout + per-product bump & upsell (configured via ProductSettingsPanel) + multi-item cart, all fulfilled atomically via SePay webhook."
status: pending
priority: P2
effort: 14h
branch: feat/order-bump-and-cart
tags: [auth, payment, marketplace, sepay, checkout, magic-link, upsell]
created: 2026-05-13
---

# Magic Link Auth + Per-Product Order Bump/Upsell + Marketplace Cart

## Goals

1. **Magic Link Auth** (Phase 0) — passwordless guest checkout. Prerequisite cho ads/landing funnel: user nhập email, paid, click magic link để activate account + xem đơn. NextAuth EmailProvider + Resend.
2. **Product Edit Panel + Order Bump** (Phase 1) — per-product bump/upsell config qua ProductSettingsPanel (1 button settings hiện trên product card + detail, admin-only). Mỗi Product có `bumpProductId` (offer trên /pay) và `upsellProductId` (offer post-paid). Bump regenerate Payment với total mới. Upsell = 1-click new payment. Kèm `Product.isVisible` để admin tạo "secret SKU" cho bump/upsell.
3. **Marketplace Cart** (Phase 2) — multi-item cart cookie-based; checkout → 1 Payment cho total → webhook fulfill N Purchase rows.

## Core design decisions (KISS)

- **Bump/Upsell = per-product, NOT per-community.** `Product.bumpProductId` + `Product.upsellProductId` (self-FK). Owner cấu hình funnel granular: mỗi product có thể có offer riêng. Tận dụng toàn bộ Product fulfillment logic hiện có.
- **`Product.isVisible Boolean @default(true)`** — ẩn product khỏi marketplace listings nhưng vẫn purchasable qua direct link và dùng được làm bump/upsell. Soft hide, NOT access control.
- **ProductSettingsPanel = single edit UI.** 1 button (gear icon) trên card + detail → dialog edit toàn bộ (title, price, desc, banner, isVisible, bumpProductId, upsellProductId). Admin-only via server-side check. Pattern theo TaskEditorButton.
- **Bump (pre-paid)**: regenerate Payment với new code + amount = base + bump.priceVnd. Old code EXPIRED. Tick/untick on /pay/[code].
- **Upsell (post-paid)**: 1-click trên /orders/[code]/success → standalone new Payment.
- **Cart = cookie** `fc_cart` chứa `[{productId, qty}]`. Không tạo bảng. Checkout → 1 Payment refType=cart → webhook fulfill N Purchase.
- **Magic link** — NextAuth EmailProvider + Resend; auto-retry email fail bằng cron.
- **Guest checkout** — User stub (emailVerified=null); magic link sau paid sẽ verify + tạo session.

## Phase overview

| Phase | Title | Effort | Depends on | Parallel? | Status |
|-------|-------|--------|------------|-----------|--------|
| 0     | Magic Link Auth (passwordless) | 5h | none | Yes (independent of 1, 2) | pending |
| 1     | Product Edit Panel + Order Bump/Upsell | 5h | none | Yes (with 0) | pending |
| 2     | Marketplace Cart | 4h | Phase 0 (for guest cart checkout) — soft dep | After Phase 0 OR partial | pending |

**Parallel plan:** Phase 0 + Phase 1 can run concurrently. Phase 2 soft-depends on Phase 0 (cart can ship logged-in-only first).

## File ownership map

| File | Phase 0 | Phase 1 | Phase 2 |
|------|---------|---------|---------|
| `prisma/schema.prisma` | (VerificationToken already exists) | add `Product.isVisible` + `Product.bumpProductId` + `Product.upsellProductId` + self-relations | (no change) |
| `auth.ts` | add EmailProvider + sendVerificationRequest | — | — |
| `lib/email-templates.ts` | add `magicLinkEmail()` | — | — |
| `lib/services/guest-checkout.ts` | CREATE | — | — |
| `app/login/page.tsx` | add email input form | — | — |
| `app/actions/guest-checkout.ts` | CREATE | — | — |
| `lib/services/payment.ts` | — | extend webhook for bumpProductId; extract runPostPurchaseSideEffects | extend for refType=cart |
| `lib/services/purchase-fulfillment.ts` | — | CREATE (extracted helper) | — |
| `lib/services/bump.ts` | — | CREATE | — |
| `lib/services/upsell.ts` | — | CREATE | — |
| `lib/services/marketplace.ts` (or list-query loc) | — | add `WHERE isVisible=true` to listing queries | — |
| `app/pay/[paymentCode]/page.tsx` | — | render bump checkbox if eligible | (no change) |
| `app/pay/[paymentCode]/bump-form.tsx` | — | CREATE | — |
| `app/orders/[paymentCode]/success/page.tsx` | — | CREATE (or merge w/ /pay) | — |
| `app/orders/[paymentCode]/success/upsell-offer.tsx` | — | CREATE | — |
| `app/actions/payment-bump.ts` | — | CREATE | — |
| `app/actions/payment-upsell.ts` | — | CREATE | — |
| `app/actions/product-settings.ts` | — | CREATE (update + list-for-picker) | — |
| `components/marketplace/product-settings-button.tsx` | — | CREATE | — |
| `components/marketplace/product-settings-dialog.tsx` | — | CREATE | — |
| `components/marketplace/product-combobox.tsx` | — | CREATE | — |
| `app/c/[slug]/marketplace/[productSlug]/page.tsx` | — | mount ProductSettingsButton | add AddToCart |
| `app/c/[slug]/marketplace/page.tsx` | — | pass isAdmin to cards | add CartIcon |
| `app/(shell)/marketplace/page.tsx` | — | pass isAdmin per-product | add CartIcon |
| `components/marketplace/product-card.tsx` | — | accept isAdmin + render ProductSettingsButton | — |
| `lib/cart.ts` | — | — | CREATE |
| `app/actions/cart.ts` | — | — | CREATE |
| `app/cart/page.tsx` | — | — | CREATE |
| `components/marketplace/add-to-cart-button.tsx` | — | — | CREATE |
| `components/marketplace/cart-icon.tsx` | — | — | CREATE |
| `lib/validations.ts` | (magic-link schemas) | (UpdateProductSettings, BumpApply, UpsellStart) | (cart schemas) |

**Conflict zones:**
- `lib/services/payment.ts` — Phase 1 + Phase 2 both add webhook branches (independent code paths). Phase 1 ships first; Phase 2 rebases.
- `[productSlug]/page.tsx` + `marketplace/page.tsx` — Phase 1 adds settings UI, Phase 2 adds cart UI. Different DOM regions; low conflict.
- `lib/validations.ts` — each phase adds distinct schemas; merge-clean.

## Dependencies

- **Phase 0**: Resend API (already configured); `VerificationToken` model (already in schema).
- **Phase 1**: 1 migration adding 3 columns (isVisible + bumpProductId + upsellProductId) on Product. Verify isVisible doesn't already exist.
- **Phase 2**: `Payment.metadata` exists; soft-needs Phase 0 for guest cart.

## Rollback strategy

- **Phase 0** — feature flag `FEATURE_MAGIC_LINK_ENABLED`. Disable removes EmailProvider; Google OAuth still works.
- **Phase 1** — feature flag `FEATURE_BUMP_UPSELL_ENABLED`. Migration additive (nullable FKs) — safe to keep schema. Hide ProductSettingsButton + skip bump/upsell rendering when flag off.
- **Phase 2** — feature flag `FEATURE_CART_ENABLED`. Hide AddToCart + /cart route. Existing buy-now untouched.
- All three phases additive — no destructive migrations.

## Success criteria

- [ ] Phase 0: Guest enters email on /login → magic link → click → session created.
- [ ] Phase 0: Guest checkout → stub user + paid + magic link → access to purchased product.
- [ ] Phase 1: Admin opens ProductSettingsPanel on any product → edits all fields incl. bump/upsell → saves.
- [ ] Phase 1: `isVisible=false` product hidden from listings, accessible via direct URL, usable as bump/upsell target.
- [ ] Phase 1: User on /pay/[code] sees bump checkbox (if product.bumpProductId set); ticking → new code with total = base + bumpPrice.
- [ ] Phase 1: SePay confirm → main + bump Purchases both COMPLETED + side effects (license, referral, notify) fired.
- [ ] Phase 1: /orders/[code]/success shows upsell offer (if upsellProductId set); 1-click → new payment.
- [ ] Phase 2: User adds 3 products → cart → 1 paymentCode → 3 Purchases COMPLETED post-webhook.
- [ ] No regression: existing single-product / challenge / subscription payments unchanged.

## Open questions

1. OTP vs magic link only for v1? → **Decision: magic link only** + auto-retry email fail via cron.
2. Guest stub user email-verified status? → **Decision:** emailVerified=null at checkout; magic link click after paid sets emailVerified + creates Session.
3. `isVisible: false` products on bump/upsell picker? → **Decision: yes** — picker explicitly includes hidden products (admin intent: "secret SKU").
4. Per-challenge / per-cart bump override? → **Deferred to v2.** Phase 1 only renders bump on `payment.refType === "product"`.
5. Upsell chain (P-A → P-B → P-C sequence)? → **Deferred.** v1 = single upsell per product, manual click each time.
6. ProductSettingsDialog inline R2 banner upload? → **Deferred.** v1 = text input for bannerUrl; banner upload reuses existing R2 flow later.
