# READY TO IMPLEMENT

Plan locked 2026-05-13. All architectural decisions finalized by owner:

- Bump/Upsell = per-product (`Product.bumpProductId`, `Product.upsellProductId`)
- `Product.isVisible Boolean @default(true)` — soft hide for "secret SKUs"
- ProductSettingsPanel = single edit UI (gear icon on card + detail, admin-only)
- Magic link in Phase 0 with auto-retry cron
- No per-community bump (`Community.bumpProductId` removed from scope)

Implementation may begin. Phase 0 + Phase 1 can run in parallel; Phase 2 after Phase 0.

Entry points:
- `./plan.md` — overview + file ownership map
- `./phase-00-magic-link-auth.md` — guest checkout prerequisite
- `./phase-01-order-bump.md` — per-product bump/upsell + ProductSettingsPanel
- `./phase-02-marketplace-cart.md` — multi-item cart
