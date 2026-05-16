# Phase 1 — Product Edit Panel + Per-Product Order Bump / Upsell

## Context Links

- Plan overview: `./plan.md`
- Phase 0 (Magic Link Auth): `./phase-00-magic-link-auth.md`
- Payment service: `lib/services/payment.ts`
- /pay page: `app/pay/[paymentCode]/page.tsx`
- SePay helpers: `lib/sepay.ts`
- Existing settings panel pattern: `components/community/challenge-settings-panel.tsx`
- Existing edit pattern: `components/community/task-editor.tsx > TaskEditorButton`
- Product detail page: `app/c/[slug]/marketplace/[productSlug]/page.tsx`
- Marketplace list (community): `app/c/[slug]/marketplace/page.tsx`
- Marketplace list (global): `app/(shell)/marketplace/page.tsx`
- Product card: `components/marketplace/product-card.tsx`

## Overview

- **Priority:** P2
- **Status:** Pending
- **Effort:** ~5h
- **Description:** Per-product bump + upsell config. Mỗi `Product` có 2 FK optional: `bumpProductId` (offer hiện trên `/pay` khi user mua product đó) và `upsellProductId` (offer hiện trên thank-you page sau khi paid). Owner config qua **ProductSettingsPanel** — 1 button settings (chỉ admin/owner thấy) mount trực tiếp trên product card + product detail; click → dialog edit toàn bộ product info (title, description, price, bannerUrl, **isVisible**, bumpProductId, upsellProductId). `Product.isVisible=false` ẩn product khỏi marketplace listings nhưng vẫn accessible qua direct link và dùng được làm bump/upsell target.

## Key Insights

- **Per-product, KHÔNG per-community.** Owner muốn fine-grained: "khi ai đó mua Course A, bump là Ebook B; khi mua Course X, bump là Ebook Y". Per-community config quá blunt — không reflect real funnel design.
- **Bump = Product FK reference**, không phải Json config. Tận dụng toàn bộ Product fulfillment logic hiện có (price, license key template, soldCount, externalUrl, fileUrl, refType=product branch trong webhook).
- **Bump vs Upsell — khác biệt UX:**
  - **Bump** = ngay trên `/pay/[code]` (chưa paid) → tick checkbox → regenerate payment với total mới. Add-to-current-order.
  - **Upsell** = sau khi paid (thank-you page hoặc `/orders/[code]/success`) → 1-click new payment cho upsell product. Separate order.
- **ProductSettingsPanel = single source of edit truth.** Không tách Edit và "Set Bump/Upsell" thành 2 UI khác — tất cả nằm chung dialog. Reduce admin cognitive load.
- **Không thay đổi Payment.amountVnd sau khi tạo** sẽ phá invariant SePay. Thay vì update amount → **regenerate Payment** với code mới khi user tick bump. Cũ EXPIRED.
- **Bump fulfillment qua Purchase** — webhook tạo Purchase với `paymentRef = paymentCode + "-bump"`, gọi `runPostPurchaseSideEffects` (extract trong phase này).
- **isVisible cần verify schema trước migration.** Hiện tại có thể chưa có; nếu thiếu → add column.

## Requirements

### Functional

**Schema:**
- Add `Product.isVisible Boolean @default(true)` (verify before migration — likely missing).
- Add `Product.bumpProductId String?` + self-relation `bumpProduct Product? @relation("ProductBump", fields: [bumpProductId], references: [id])`.
- Add `Product.upsellProductId String?` + self-relation `upsellProduct Product? @relation("ProductUpsell", fields: [upsellProductId], references: [id])`.
- Add reverse relations on Product: `bumpedBy Product[] @relation("ProductBump")`, `upsellFor Product[] @relation("ProductUpsell")`.
- NO `Community.bumpProductId` — removed from scope.

**Visibility behavior:**
- `Product.isVisible = false`:
  - Hidden from marketplace listings (community + global).
  - Hidden from search/filter queries.
  - Still accessible via direct URL `/c/[slug]/marketplace/[productSlug]` (404 only if not exists or wrong community).
  - Still usable as `bumpProductId` / `upsellProductId` target.
  - Direct `/pay/[code]` purchase still works (admin can share link manually).

**ProductSettingsPanel:**
- Server component wrapper computes `isAdmin = session?.user?.id === product.community.ownerId || membership.role === ADMIN`.
- If `isAdmin` → renders client `<ProductSettingsButton>` (gear/cog icon).
- Click → opens `<ProductSettingsDialog>`:
  - Form fields: title, slug, description (textarea), priceVnd, priceOldVnd, type, pillar, bannerUrl (text input v1; R2 upload later), isVisible (toggle), bumpProductId (combobox), upsellProductId (combobox).
  - Combobox source: all products in same community (incl. isVisible=false), excluding current product itself (can't bump/upsell to itself).
  - Save → `updateProductSettingsAction({productId, ...fields})` → validates ownership + zod → prisma.product.update → revalidate marketplace list + detail + global marketplace.
- Mount points:
  - `components/marketplace/product-card.tsx` — top-right corner, absolute-positioned, hover-visible (CSS opacity transition). Admin-only.
  - `app/c/[slug]/marketplace/[productSlug]/page.tsx` — inline next to `<h1>{product.title}</h1>`. Admin-only.

**Order Bump (on /pay/[code]):**
- /pay page logic: load `payment` with refType=product → fetch `product.bumpProduct`. If exists AND status=PENDING AND no bump already applied → render `<BumpForm>`.
- BumpForm shows: bumpProduct.title + bumpProduct.priceVnd + checkbox "Thêm: {title} +{priceVnd}đ".
- Tick → `applyBumpAction({paymentCode})` → server action:
  - Auth: `payment.userId === session.user.id` (or guest-checkout flow with cookie token).
  - In `$transaction`: create new Payment with `amount = base + bump.priceVnd`, `metadata = {...old, bumpProductId, originPaymentCode}`. Mark old as EXPIRED with `metadata.replacedBy`.
  - Idempotent: if `old.metadata.replacedBy` exists → return existing newCode.
- Untick → `removeBumpAction({paymentCode})` → reverse: regenerate without bump.
- Redirect to `/pay/[newCode]`.

**Webhook fulfillment:**
- In `matchSePayTransactionToPayment`, after fulfilling main refType:
  - If `metadata.bumpProductId && !metadata.bumpFulfilled`:
    - Fetch bumpProduct in tx.
    - Create Purchase row (status=COMPLETED, paymentRef=`${code}-bump`).
    - Update payment.metadata.bumpFulfilled=true + bumpPurchaseId.
    - Queue `runPostPurchaseSideEffects(bumpPurchase.id)` post-tx (license, referral, notify).

**Upsell (on thank-you / success):**
- After webhook confirms → `/orders/[paymentCode]/success` (or existing success view) loads main `product.upsellProduct`.
- If exists → render `<UpsellOffer>` card: bannerUrl, title, price, "Mua ngay với 1 cú click" button.
- Click → server action `startUpsellPurchaseAction({sourcePaymentCode, upsellProductId})`:
  - Auth same as above.
  - Calls existing `startProductPurchase(userId, upsellProductId)` to create new Payment.
  - Tags `metadata.upsellSourcePaymentCode = sourcePaymentCode` for analytics.
  - Redirect `/pay/[newCode]`.
- No special fulfillment logic — uses standard product refType branch.

### Non-functional
- Bump regeneration idempotent (race: 2 rapid ticks → 1 new code, not 2).
- Webhook idempotent (`metadata.bumpFulfilled` guard prevents duplicate Purchase).
- Atomic: main + bump fulfillment same `prisma.$transaction`.
- ProductSettingsDialog — explicit save (no auto-save), `useTransition` loading state.
- Marketplace queries (list, search) MUST filter `WHERE isVisible = true`. Detail page bypasses filter (so admin can preview via direct link).
- Combobox in dialog — paginate/search if community has >50 products (server-side filtering via action).

## Architecture

### Data flow — Apply bump

```
User on /pay/CODE-A (amount=200k, refType=product, refId=P-X)
  → load product P-X → product.bumpProductId = P-Y (50k)
  → render <BumpForm bumpProduct={P-Y} paymentCode="CODE-A" />
  → user ticks → POST applyBumpAction({code: "CODE-A"})
  → server action in $transaction:
     1. Find old payment CODE-A (status=PENDING, userId match)
     2. Idempotency: if old.metadata.replacedBy → return existing
     3. Load product P-X → bumpProduct = P-X.bumpProduct
        - If missing OR priceVnd == 0 → throw "bump_unavailable"
     4. Create new Payment CODE-B:
        - amount = 200k + 50k = 250k
        - refType="product", refId="P-X" (unchanged)
        - userId, communityId same
        - metadata = { ...oldMetadata, bumpProductId: "P-Y", originPaymentCode: "CODE-A" }
     5. Mark old payment CODE-A → EXPIRED + metadata.replacedBy = "CODE-B"
  → redirect /pay/CODE-B
```

### Data flow — Webhook fulfill bump

```
SePay webhook → matchSePayTransactionToPayment(CODE-B, 250k)
  → in $transaction:
     a. Update Payment CODE-B → COMPLETED
     b. Fulfill main refType (existing Purchase for P-X → COMPLETED via product branch)
     c. NEW: if metadata.bumpProductId && !metadata.bumpFulfilled:
        - bumpProduct = await tx.product.findUnique({id: metadata.bumpProductId})
        - if (!bumpProduct) → logger.warn + skip (don't fail main)
        - else:
          - bumpPurchase = await tx.purchase.create({
              data: { userId, productId: bumpProductId, amountVnd: bumpProduct.priceVnd,
                      status: COMPLETED, paymentRef: `${paymentCode}-bump` }
            })
          - await tx.payment.update({
              where:{id}, data:{ metadata:{...metadata, bumpFulfilled: true, bumpPurchaseId: bumpPurchase.id} }
            })
     d. POST-tx (after $transaction returns):
        - runPostPurchaseSideEffects(mainPurchaseId)  // existing
        - if bumpPurchase → runPostPurchaseSideEffects(bumpPurchase.id)
```

### Data flow — Upsell

```
User /pay/CODE-B status=COMPLETED → /orders/CODE-B/success
  → load main product P-X → P-X.upsellProduct = P-Z (300k)
  → render <UpsellOffer product={P-Z} sourceCode="CODE-B" />
  → user clicks "Mua ngay" → startUpsellPurchaseAction({sourcePaymentCode: "CODE-B", upsellProductId: "P-Z"})
  → server:
     1. Auth check
     2. const newPayment = await startProductPurchase(userId, "P-Z")
     3. await prisma.payment.update({
          where: {id: newPayment.id},
          data: { metadata: {...newPayment.metadata, upsellSourcePaymentCode: "CODE-B"} }
        })
     4. return { newPaymentCode: newPayment.paymentCode }
  → redirect /pay/CODE-C (standard product payment flow)
```

### Data flow — Edit product via ProductSettingsPanel

```
Admin on /c/slug/marketplace → hovers product card → sees ⚙️ icon (ProductSettingsButton)
  → click → ProductSettingsDialog opens with form pre-filled
  → admin sets bumpProductId via combobox (search by title, lists all community products)
  → submit → updateProductSettingsAction({productId, ...fields})
     - auth check: session.user.id === product.community.ownerId OR membership.role === ADMIN
     - zod validate (UpdateProductSettingsSchema)
     - validate bumpProductId / upsellProductId belong to same community + not self-ref
     - prisma.product.update(...)
     - revalidatePath(`/c/${slug}/marketplace`)
     - revalidatePath(`/c/${slug}/marketplace/${product.slug}`)
     - revalidatePath(`/marketplace`)
  → dialog closes, card re-renders
```

### Component interactions

```
ProductSettingsButton (client, admin-only, mounted via server wrapper)
  → product card (top-right, hover) — `<ProductCard>` rerender
  → product detail (inline next to title) — page-level
  → opens ProductSettingsDialog → form with all fields → updateProductSettingsAction

ProductCombobox (client, used inside ProductSettingsDialog x2)
  → renders for bumpProductId field + upsellProductId field
  → fetches community products via action (cached); excludes self
  → search-as-you-type

/pay/[code] page (server)
  → loads payment + product + product.bumpProduct
  → if eligible: <BumpForm bumpProduct paymentCode bumpApplied />

BumpForm (client)
  → checkbox + price breakdown
  → onChange → applyBumpAction / removeBumpAction → router.push(/pay/[newCode])

/orders/[code]/success page (server)
  → loads payment + main product + product.upsellProduct
  → if exists + status=COMPLETED: <UpsellOffer />

UpsellOffer (client)
  → 1-click button → startUpsellPurchaseAction → router.push(/pay/[newCode])
```

## Related Code Files

### To create
- `lib/services/bump.ts` — `applyBumpToPayment(paymentCode, userId)`, `removeBumpFromPayment(paymentCode, userId)`.
- `lib/services/upsell.ts` — `startUpsellPurchase(sourcePaymentCode, upsellProductId, userId)`.
- `lib/services/purchase-fulfillment.ts` — extracted `runPostPurchaseSideEffects(purchaseId)` (license, referral, notify, CRM).
- `app/actions/payment-bump.ts` — `applyBumpAction`, `removeBumpAction`.
- `app/actions/payment-upsell.ts` — `startUpsellPurchaseAction`.
- `app/actions/product-settings.ts` — `updateProductSettingsAction`, `listCommunityProductsForPickerAction`.
- `app/pay/[paymentCode]/bump-form.tsx` — client component.
- `app/orders/[paymentCode]/success/upsell-offer.tsx` — client component (NEW route or merge into existing success view).
- `components/marketplace/product-settings-button.tsx` — client gear button + dialog trigger.
- `components/marketplace/product-settings-dialog.tsx` — client dialog with full edit form.
- `components/marketplace/product-combobox.tsx` — reusable picker for bump/upsell fields.

### To modify
- `prisma/schema.prisma`:
  - Verify + add `Product.isVisible Boolean @default(true)`.
  - Add `Product.bumpProductId String?` + self-relation `bumpProduct` + reverse `bumpedBy`.
  - Add `Product.upsellProductId String?` + self-relation `upsellProduct` + reverse `upsellFor`.
- `lib/services/payment.ts`:
  - Extend `matchSePayTransactionToPayment` to handle `metadata.bumpProductId`.
  - Extract post-tx side effects (license/referral/notify) into `purchase-fulfillment.ts > runPostPurchaseSideEffects`. Refactor existing product branch to call helper.
- `lib/services/marketplace.ts` (or wherever product list queries live) — add `where: { isVisible: true }` filter to listing queries. Detail page query stays unfiltered.
- `lib/validations.ts` — add `UpdateProductSettingsSchema`, `BumpApplySchema`, `UpsellStartSchema`.
- `app/pay/[paymentCode]/page.tsx` — render `<BumpForm>` if eligible.
- `app/orders/[paymentCode]/success/page.tsx` — render `<UpsellOffer>` if eligible. (If route doesn't exist, create it; or merge into `/pay/[code]` when status=COMPLETED.)
- `app/c/[slug]/marketplace/[productSlug]/page.tsx` — mount `<ProductSettingsButton>` next to title (admin-only via server check).
- `app/c/[slug]/marketplace/page.tsx` — pass `isAdmin` prop to product cards.
- `app/(shell)/marketplace/page.tsx` — same; pass `isAdmin` per-product (compute per item since global marketplace spans communities).
- `components/marketplace/product-card.tsx` — accept `isAdmin` prop; mount `<ProductSettingsButton>` top-right (hover-visible).

### Untouched
- `lib/sepay.ts` — `createPayment` already accepts arbitrary refType/refId; no change needed.
- `app/actions/community-settings.ts` — no community-level bump anymore.

## Implementation Steps

1. **Schema** —
   - Read `prisma/schema.prisma`; verify whether `Product.isVisible` exists. If missing add it.
   - Add `bumpProductId`, `upsellProductId` + 4 self-relation lines on Product model.
   - Migration: `pnpm prisma migrate dev --name add_product_visibility_and_bump_upsell`.
   - Verify generated client has new fields.
2. **Validation** — `lib/validations.ts`:
   - `UpdateProductSettingsSchema` — title 1-200, slug kebab regex, description max 5000, priceVnd ≥0, priceOldVnd ≥0 nullable, type enum, pillar enum, bannerUrl URL nullable, isVisible boolean, bumpProductId cuid nullable, upsellProductId cuid nullable. Custom refinement: bumpProductId !== productId, upsellProductId !== productId.
   - `BumpApplySchema` — `{paymentCode: string}`.
   - `UpsellStartSchema` — `{sourcePaymentCode: string, upsellProductId: string}`.
3. **Purchase fulfillment helper** — extract from `payment.ts > matchSePayTransactionToPayment` product branch into `lib/services/purchase-fulfillment.ts > runPostPurchaseSideEffects(purchaseId)`. Includes: assignLicenseKey, convertReferralFromPurchase, dispatchToChannels, optional CRM sync. Existing single-product branch refactored to call helper.
4. **Service: bump** — `lib/services/bump.ts`:
   - `applyBumpToPayment(paymentCode, userId)`:
     - Load old payment (must be PENDING + userId match).
     - Idempotency: if `metadata.replacedBy` → return that code.
     - Load main product → `product.bumpProduct`. Reject if missing or priceVnd=0.
     - $tx: create new Payment + expire old. Return newCode.
   - `removeBumpFromPayment(paymentCode, userId)`:
     - Similar but new Payment without bumpProductId in metadata.
5. **Service: upsell** — `lib/services/upsell.ts > startUpsellPurchase`:
   - Validate sourcePayment.userId === userId + sourcePayment.status === COMPLETED.
   - Call existing `startProductPurchase(userId, upsellProductId)`.
   - Patch `payment.metadata.upsellSourcePaymentCode`.
   - Return newPaymentCode.
6. **Webhook extension** — in `matchSePayTransactionToPayment`, after main product branch:
   ```ts
   const md = (payment.metadata ?? {}) as any;
   if (md.bumpProductId && !md.bumpFulfilled) {
     const bp = await tx.product.findUnique({ where: { id: md.bumpProductId } });
     if (bp) {
       const bumpPurchase = await tx.purchase.create({
         data: { userId: payment.userId, productId: bp.id,
                 amountVnd: bp.priceVnd, status: "COMPLETED",
                 paymentRef: `${payment.paymentCode}-bump` },
       });
       await tx.payment.update({
         where: { id: payment.id },
         data: { metadata: { ...md, bumpFulfilled: true, bumpPurchaseId: bumpPurchase.id } },
       });
       sideEffectsQueue.push(bumpPurchase.id);
     } else {
       logger.warn({ paymentCode: payment.paymentCode, bumpProductId: md.bumpProductId }, "bump product missing");
     }
   }
   ```
   Post-tx: loop `sideEffectsQueue` and call `runPostPurchaseSideEffects`.
7. **Server actions** — `app/actions/payment-bump.ts`, `app/actions/payment-upsell.ts`:
   - All actions: auth via `getServerSession`, validate input via zod, delegate to service.
   - Return `{ok: boolean, newPaymentCode?: string, error?: string}`.
8. **Product settings action** — `app/actions/product-settings.ts`:
   - `updateProductSettingsAction({productId, ...fields})`:
     - Load product with community; check `session.user.id === community.ownerId` OR ADMIN membership.
     - Validate via `UpdateProductSettingsSchema`.
     - If bumpProductId/upsellProductId provided: validate target product exists + `target.communityId === product.communityId`.
     - `prisma.product.update(...)`.
     - `revalidatePath` on 3 URLs (community marketplace, detail, global marketplace).
   - `listCommunityProductsForPickerAction({communityId, search?, excludeProductId})`:
     - Auth: admin only.
     - Returns `[{id, title, priceVnd, isVisible}]` matching search (case-insensitive title), excluding excludeProductId. Includes hidden products.
9. **Marketplace listing query update** — locate marketplace list queries; add `where: { isVisible: true }`. Verify detail page query doesn't carry the filter (admins need to preview hidden products).
10. **/pay page UI** — fetch `product.bumpProduct` in server component. If `payment.status === PENDING && bumpProduct && !md.bumpProductId` → render `<BumpForm bumpProduct paymentCode />` above QR. If `md.bumpProductId` → render summary line "Đã thêm: {title} (+{price}đ)" with untick option.
11. **BumpForm component** — client; checkbox; `useTransition`; onChange → call action → router.push.
12. **Success/upsell view**:
    - Decide: extend `/pay/[code]/page.tsx` with status=COMPLETED branch OR create `/orders/[code]/success/page.tsx`. Recommend creating `/orders/[code]/success` for clean URL.
    - Fetch main product + `product.upsellProduct`. Render `<UpsellOffer>` if exists.
13. **UpsellOffer component** — client; banner image + title + price + CTA button → startUpsellPurchaseAction → redirect.
14. **ProductSettingsButton + Dialog**:
    - `product-settings-button.tsx` — client; gear icon button; opens dialog on click; uses `Dialog` from existing shadcn ui kit.
    - `product-settings-dialog.tsx` — modal with form; pre-filled; 2x `<ProductCombobox>` for bump/upsell; submit calls `updateProductSettingsAction`; useTransition.
    - `product-combobox.tsx` — search input + result list; debounced call to `listCommunityProductsForPickerAction`. Selecting product → sets formState.bumpProductId.
15. **Mount ProductSettingsButton**:
    - `product-card.tsx` — accept `isAdmin` prop; if true render button absolute top-right; CSS: `opacity-0 group-hover:opacity-100 transition`.
    - `[productSlug]/page.tsx` — compute `isAdmin` server-side; render button inline next to title.
    - `marketplace/page.tsx` (community) + `(shell)/marketplace/page.tsx` (global) — pass `isAdmin` to each card. Global: compute per-product (different communities, different owners).
16. **Smoke test** (manual):
    - Create products P-A (200k), P-B (50k, isVisible=false), P-C (300k).
    - Open ProductSettingsDialog on P-A → set bumpProductId=P-B, upsellProductId=P-C → save.
    - Start payment for P-A → /pay/[code] shows bump checkbox for P-B.
    - Tick → new code with 250k total.
    - Simulate webhook → P-A and P-B both COMPLETED Purchase rows; license keys assigned for LICENSE type.
    - Visit /orders/[code]/success → shows P-C upsell offer.
    - Click upsell → new payment for P-C @ 300k.
    - Verify P-B hidden from marketplace listings but accessible via /c/[slug]/marketplace/p-b-slug.

## Todo List

- [ ] Verify `Product.isVisible` field exists; add if missing
- [ ] Add `Product.bumpProductId` + `upsellProductId` + self-relations to schema
- [ ] Run migration `add_product_visibility_and_bump_upsell`
- [ ] Define `UpdateProductSettingsSchema`, `BumpApplySchema`, `UpsellStartSchema` in `lib/validations.ts`
- [ ] Extract `runPostPurchaseSideEffects` to `lib/services/purchase-fulfillment.ts`
- [ ] Refactor existing product-refType branch to use helper
- [ ] Create `lib/services/bump.ts` (applyBumpToPayment, removeBumpFromPayment)
- [ ] Create `lib/services/upsell.ts` (startUpsellPurchase)
- [ ] Extend webhook to handle `metadata.bumpProductId`
- [ ] Update marketplace listing queries with `WHERE isVisible=true`
- [ ] Create `app/actions/payment-bump.ts`
- [ ] Create `app/actions/payment-upsell.ts`
- [ ] Create `app/actions/product-settings.ts` (update + list-for-picker)
- [ ] Create `app/pay/[paymentCode]/bump-form.tsx`
- [ ] Update `app/pay/[paymentCode]/page.tsx` to render bump UI
- [ ] Create `/orders/[paymentCode]/success/page.tsx` + `upsell-offer.tsx`
- [ ] Create `components/marketplace/product-settings-button.tsx`
- [ ] Create `components/marketplace/product-settings-dialog.tsx`
- [ ] Create `components/marketplace/product-combobox.tsx`
- [ ] Mount settings button on product card (admin-only, hover)
- [ ] Mount settings button on product detail page (admin-only, next to title)
- [ ] Pass `isAdmin` from community + global marketplace pages
- [ ] Smoke test end-to-end (bump + upsell + settings + isVisible)
- [ ] Update `docs/competitor-analysis.md` (Whop parity: per-product order bump + upsell)

## Success Criteria

- [ ] Admin sees ⚙️ button on product cards (hover) + product detail (always). Non-admin sees nothing.
- [ ] ProductSettingsDialog opens with all fields pre-filled; bump/upsell comboboxes list community products (incl. hidden).
- [ ] Save → product updates persisted; marketplace + detail reflect changes within 1s (revalidate).
- [ ] Setting `isVisible=false` → product disappears from listings but accessible via direct URL.
- [ ] Pending /pay page shows bump checkbox when source product has bumpProductId set.
- [ ] Tick bump → new paymentCode with amount = base + bumpProduct.priceVnd; old code EXPIRED.
- [ ] Untick → back to base amount.
- [ ] SePay webhook → main Purchase + bump Purchase both COMPLETED; license key for LICENSE-type bump assigned.
- [ ] External notify channel receives both purchase events.
- [ ] /orders/[code]/success shows upsell offer when source product has upsellProductId.
- [ ] Click upsell → new payment created with upsellSourcePaymentCode metadata; standard product flow.
- [ ] Cross-community bump/upsell rejected by action (validates same communityId).
- [ ] Self-reference bump/upsell rejected (productId !== bumpProductId/upsellProductId).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Race: user ticks bump twice fast → 2 new payments | Medium | Low | applyBumpAction idempotent: check `oldPayment.metadata.replacedBy` exists → return existing newCode. |
| Webhook fires on EXPIRED old code | Low | Medium | Existing `status !== PENDING` guard returns not_matched. |
| Bump product deleted between save + checkout | Low | Medium | `applyBumpToPayment` validates Product exists → throws "bump_unavailable" if missing; UI gracefully hides checkbox. |
| Bump product priceVnd = 0 | Low | Low | Reject in service (priceVnd must > 0). |
| Webhook double-fulfills bump on retry | Low | High | Idempotency guard `metadata.bumpFulfilled === true` skips creation. |
| Admin sets bumpProductId = self → infinite loop UX | Low | Low | Schema-level: zod refinement rejects self-ref. Render-time: skip rendering bump if `bumpProduct.id === product.id` (defensive). |
| Admin sets bump to product from another community | Medium | Medium | Action validates target.communityId === product.communityId; rejects with error message. |
| Settings button leaks to non-admin | Low | High | Server-side `isAdmin` check before rendering button (not just client). Action also rechecks ownership. |
| Combobox slow on large catalog (500+ products) | Low | Medium | Server-side search via action with `take: 50` + ILIKE on title. |
| `isVisible: false` products appear in listings by mistake | Medium | Medium | Filter `WHERE isVisible=true` in ALL marketplace queries (list, search, global). Add tester checklist. Detail page + settings dialog bypass filter intentionally. |
| Upsell loop (P-A upsells P-B which upsells P-A) | Low | Low | Acceptable v1 — user explicitly clicks each time. No auto-chain. Document for future cap. |
| Cart payments (Phase 2) don't have single refId → bump shouldn't show | Medium | Low | /pay eligibility: only render BumpForm if `payment.refType === "product"` (skip cart, challenge, subscription for v1). Future: per-cart bump via cart-level config. |

## Security Considerations

- `applyBumpAction` / `removeBumpAction` — auth: only `payment.userId === session.user.id`.
- `startUpsellPurchaseAction` — same; also verify sourcePayment.status === COMPLETED.
- `updateProductSettingsAction` — owner or community ADMIN; reject if user doesn't have role.
  - Validate bumpProductId / upsellProductId belong to **same community** as edited product.
  - Reject self-reference.
- `listCommunityProductsForPickerAction` — admin-only (else leaks hidden product titles).
- Webhook trust — existing SePay signature validation covers bump branch.
- `isVisible=false` is NOT a security boundary (still accessible by URL). Document as "soft hide for marketing", not access control. True product access control = Purchase row + Membership.

## Backwards Compatibility

- All 3 new columns nullable / defaulted → existing data untouched.
- `isVisible` defaults true → no behavior change for existing products.
- `payment.metadata` already nullable JSON → existing payments unaffected.
- Webhook new branch fires only when `metadata.bumpProductId` set → no risk to existing fulfillment.
- ProductSettingsButton hidden for non-admins → zero visual change for members/guests.
- Migration additive only — no data backfill.

## Next Steps

- Monitor: bump take rate, upsell conversion, hidden product purchases (direct-link sales).
- Phase 2 (Cart) can layer cart-level bump later if data justifies.
- Future: per-product A/B test bump copy/price.
- Future: ProductSettingsDialog inline R2 banner upload (currently text URL).
- Future: Upsell sequence (chain >1 upsell post-paid).
- Future: Funnel analytics dashboard — bump take rate per source product.
