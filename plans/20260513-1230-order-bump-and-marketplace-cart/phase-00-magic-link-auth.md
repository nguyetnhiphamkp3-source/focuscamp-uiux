# Phase 0 — Magic Link / Passwordless Auth

## Context Links

- Plan overview: `./plan.md`
- Auth config: `app/auth.ts`
- Existing email infra: `lib/email.ts`, `lib/email-templates.ts`
- NextAuth schema (existing): `VerificationToken` in `prisma/schema.prisma` line 90-96
- NextAuth EmailProvider docs: https://authjs.dev/getting-started/authentication/email

## Overview

- **Priority:** P2
- **Status:** Pending
- **Effort:** ~5h
- **Description:** Enable passwordless email login (magic link). Guest can paste email, receive 1-click link, get session. Also enables **guest checkout**: guest enters email at /cart checkout (no login required) → stub User created → after payment webhook, magic link emailed → click activates session + redirects to /my/purchases.

## Key Insights

- **NextAuth EmailProvider is the canonical path** — handles token generation, verification, and session creation. No need to roll custom flow.
- `VerificationToken` model already in schema (line 90-96) — NextAuth auto-uses it. Zero schema change for magic link itself.
- **Guest checkout edge case** — at checkout we create `User` row with `emailVerified=null` so Payment.userId is valid. Webhook fulfillment triggers magic link send to that email. User clicking link verifies email and creates Session. Reusing NextAuth's token machinery for this — no custom token store.
- **Token expiry default = 24h** (NextAuth) — keep it. Single-use enforced by NextAuth (token deleted on consume).
- **Replay protection** — NextAuth deletes used VerificationToken row immediately after exchange for Session. Concurrent reuse → second attempt fails with `Verification` error.
- **Existing Google OAuth stays as primary path.** Email is secondary fast-path, especially for landing-page / ads traffic.

## Requirements

### Functional
- `/login` page renders: Google button (existing) + email input + "Send magic link" submit.
- Submitting email → NextAuth `signIn("email", {email})` → email sent via Resend → success state ("Check your inbox").
- Magic link in email → opens `/api/auth/callback/email?token=...&email=...` → session created → redirect to `callbackUrl` (default `/`).
- **Guest checkout** (used by Phase 2 cart): server action `startGuestCheckoutAction({email, cartItems})` →
  1. `upsert User` by email (create if missing, no Google account linked, `emailVerified=null`).
  2. Create Payment + Purchases tied to that userId (reuses existing logic).
  3. Send pre-payment confirmation email (just "we got your order, complete payment at /pay/[code]").
  4. After SePay webhook completes Payment → trigger `sendActivationMagicLink(userId)` → uses NextAuth's `EmailProvider.sendVerificationRequest` callback directly to send link.
  5. User clicks → session active → redirect to `/my/purchases`.

### Non-functional
- Magic link email rate limited: max 3 sends/email/15min (prevent abuse).
- Token TTL: 24h.
- Sender: existing `RESEND_FROM` env.
- Idempotent guest user creation: if email already exists as Google user → use that account, no email overwrite.

## Architecture

### Data flow — Standard magic link login

```
User on /login → enter email "x@y.com" → submit
  → server action signInWithEmailAction({email})
  → calls NextAuth signIn("email", {email, redirect: false})
  → NextAuth:
     - inserts VerificationToken{identifier: email, token: hash, expires: +24h}
     - calls EmailProvider.sendVerificationRequest({url, email})
       → our impl uses sendEmail() + magicLinkEmail() template
  → return {ok: true}
  → UI shows "Check your inbox at x@y.com"

User clicks link → GET /api/auth/callback/email?token=...&email=...
  → NextAuth verifies token, creates/updates User, creates Session cookie
  → If User new: PrismaAdapter triggers events.createUser → welcome email + affiliate attribution (existing logic)
  → redirects to callbackUrl
```

### Data flow — Guest checkout

```
Guest on /cart (no session) → enter email "g@y.com" + click "Pay as guest"
  → server action startGuestCheckoutAction({email, cartItems})
  → in $transaction:
     1. upsert User{email: "g@y.com"} → userId
        - If existing user → use existing userId (do NOT touch emailVerified)
        - If new → User{email, emailVerified: null, name: null}
     2. Create N Purchase rows (status=PENDING) for userId
     3. Create Payment refType="cart", userId=userId, metadata={cart.purchaseIds, guestCheckout: true}
  → clear cart cookie
  → redirect /pay/[code]

User pays via VietQR → SePay webhook hits matchSePayTransactionToPayment
  → Payment + Purchases set to COMPLETED (existing)
  → POST-tx: detect metadata.guestCheckout === true && user.emailVerified === null
     → call sendActivationMagicLink(userId)
        - generates VerificationToken via NextAuth adapter
        - sends email with subject "Đơn hàng đã thanh toán — kích hoạt tài khoản"
        - body includes magic link + order summary + /my/purchases preview
     → also dispatch standard notify channels

User clicks magic link → session created (existing NextAuth flow)
  → on first verify, set emailVerified = now()
  → redirect to /my/purchases (callbackUrl encoded in link)
```

### Component interactions

```
/login page
  → <GoogleSignInButton /> (existing)
  → <EmailSignInForm /> (NEW client component)
     → calls signInWithEmailAction
     → on success → render "Check inbox" state

EmailProvider (in auth.ts)
  → sendVerificationRequest({identifier, url, expires, provider, token})
     → our impl: sendEmail({to: identifier, subject, html: magicLinkEmail({url})})

/cart page (Phase 2 dep)
  → if not session?.user → show "Pay as guest" form
     → <GuestCheckoutForm /> client component
        → email input + checkout submit
        → calls startGuestCheckoutAction
        → on success → redirect /pay/[code]
```

## Related Code Files

### To create
- `lib/services/guest-checkout.ts` — `upsertGuestUser(email)`, `sendActivationMagicLink(userId)`. Wraps NextAuth adapter calls.
- `lib/email-templates.ts` — add `magicLinkEmail({url, isGuestActivation?})` template (existing file, append export).
- `app/actions/guest-checkout.ts` — `startGuestCheckoutAction({email, cartItems})` server action.
- `app/login/email-sign-in-form.tsx` — client component.
- `app/login/actions.ts` — `signInWithEmailAction({email})` (calls NextAuth signIn server-side).
- `components/cart/guest-checkout-form.tsx` — client component for /cart guest flow.

### To modify
- `auth.ts` — add `EmailProvider` import from `next-auth/providers/email`; configure `sendVerificationRequest` to use our `sendEmail` helper.
- `app/login/page.tsx` — mount `<EmailSignInForm>` below Google button.
- `lib/email-templates.ts` — add magic link template export.
- `lib/rate-limit.ts` — add `magicLinkRateLimit` key (3/15min/email).

### Untouched
- `prisma/schema.prisma` — `VerificationToken` already exists. No migration.
- `middleware.ts` — `/api/auth/*` already in PUBLIC_PREFIXES.
- `lib/email.ts` — Resend sender unchanged.

## Implementation Steps

1. **Install/verify NextAuth EmailProvider** — already bundled in `next-auth` v5. Just import. No new dependency.
2. **Email template** — in `lib/email-templates.ts`, add:
   ```ts
   export function magicLinkEmail({ url, isActivation = false }: { url: string; isActivation?: boolean }) {
     const subject = isActivation
       ? "Đơn hàng đã thanh toán — kích hoạt tài khoản focus.camp"
       : "🔥 Đăng nhập focus.camp";
     const html = `<p>Click để ${isActivation ? "kích hoạt tài khoản và xem đơn hàng" : "đăng nhập"}:</p>
       <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#1B9E75;color:#fff;border-radius:8px;text-decoration:none">${isActivation ? "Kích hoạt tài khoản" : "Đăng nhập ngay"}</a></p>
       <p style="color:#888;font-size:13px">Link hết hạn sau 24h. Nếu không phải bạn, bỏ qua email này.</p>`;
     return { subject, html };
   }
   ```
3. **NextAuth config** — in `auth.ts`, add provider:
   ```ts
   import EmailProvider from "next-auth/providers/email";
   // ...
   providers: [
     Google({ ... }),
     EmailProvider({
       maxAge: 24 * 60 * 60,
       async sendVerificationRequest({ identifier, url }) {
         const isActivation = url.includes("activation=1");
         await sendEmail({ to: identifier, ...magicLinkEmail({ url, isActivation }) });
       },
     }),
   ],
   ```
4. **Login form** — `app/login/page.tsx` add email form; create `app/login/email-sign-in-form.tsx` with input + submit → calls `signInWithEmailAction`.
5. **Sign-in action** — `app/login/actions.ts`:
   ```ts
   "use server";
   import { signIn } from "@/auth";
   import { rateLimit } from "@/lib/rate-limit";
   export async function signInWithEmailAction({ email }: { email: string }) {
     const limited = await rateLimit({ key: `magic-link:${email}`, limit: 3, windowMs: 15 * 60_000 });
     if (limited) return { ok: false, error: "Quá nhiều lần thử. Đợi 15 phút." };
     await signIn("email", { email, redirect: false });
     return { ok: true };
   }
   ```
6. **Guest checkout service** — `lib/services/guest-checkout.ts`:
   - `upsertGuestUser(email)` — `prisma.user.upsert({where:{email}, create:{email, emailVerified: null}, update: {}})`. Returns userId.
   - `sendActivationMagicLink(userId)` — fetch user; call `PrismaAdapter` token creation directly or trigger NextAuth's signIn email flow with `redirectTo=/my/purchases&activation=1`.
7. **Guest checkout action** — `app/actions/guest-checkout.ts > startGuestCheckoutAction({email, cartItems})` — wraps `upsertGuestUser` + reuses Phase 2's `checkoutCartAction` core logic with the new userId.
8. **Activation trigger** — in `lib/services/payment.ts` post-tx, when Payment.metadata.guestCheckout === true → call `sendActivationMagicLink(payment.userId)` once.
9. **Smoke test** — manual:
   - Test A: existing user logs in via email → receives link → clicks → lands on `/`.
   - Test B: new email logs in via email → User created + welcomeEmail sent (createUser event) → session active.
   - Test C: guest fills email at /cart (after Phase 2 ships) → pays via webhook simulator → activation email received → click → /my/purchases shows items.
   - Test D: rate limit kicks in after 3 sends in 15min.

## Todo List

- [ ] Add `magicLinkEmail` export to `lib/email-templates.ts`
- [ ] Import + configure `EmailProvider` in `auth.ts`
- [ ] Add `magicLinkRateLimit` helper key to `lib/rate-limit.ts`
- [ ] Create `app/login/actions.ts > signInWithEmailAction`
- [ ] Create `app/login/email-sign-in-form.tsx` (client)
- [ ] Mount form in `app/login/page.tsx`
- [ ] Create `lib/services/guest-checkout.ts` (upsert + sendActivationMagicLink)
- [ ] Create `app/actions/guest-checkout.ts > startGuestCheckoutAction`
- [ ] Add activation trigger hook in `lib/services/payment.ts` post-tx
- [ ] Create `components/cart/guest-checkout-form.tsx` (consumed by Phase 2)
- [ ] Smoke tests A/B/C/D
- [ ] Update `docs/system-architecture.md` (Auth section)

## Success Criteria

- [ ] User on /login enters email → success message shows; email lands in inbox within 30s.
- [ ] Clicking magic link → user lands on callbackUrl (default `/`), Session cookie set.
- [ ] Single-use enforced: clicking same link 2nd time → error page (NextAuth standard).
- [ ] Token expires after 24h → error.
- [ ] Rate limit: 4th send in 15min → action returns error.
- [ ] Guest checkout: stub user created with `emailVerified=null`; after payment + click → `emailVerified` set + session live.
- [ ] No regression: Google OAuth login still works.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| User reuses magic link from email | Low | Medium | NextAuth single-use enforcement; token row deleted on consume. |
| Email goes to spam | Medium | Medium | Resend domain DKIM/SPF already configured (existing welcomeEmail works). Monitor delivery rate. |
| Guest creates many stub users (email enumeration) | Medium | Low | Rate limit signInWithEmailAction by IP + email. Stub users with `emailVerified=null` have no Membership → harmless. Optional cron: delete unverified users > 90d with no Purchases. |
| Replay attack via leaked link in browser history | Low | Medium | Tokens single-use + 24h TTL. Document risk; recommend "log out other devices" feature in Settings (future). |
| Guest checkout payment confirmed but activation email fails | Medium | High | Retry hook: store `metadata.activationEmailSent: boolean`; cron retries up to 3x over 24h. User can also request resend at /login by entering same email. |
| EmailProvider misconfig blocks all logins | Low | High | Wrap `sendVerificationRequest` in try/catch + log; don't throw — NextAuth still returns success URL (anti-enumeration); user retries with Google. Feature flag `FEATURE_MAGIC_LINK_ENABLED` to disable provider quickly. |
| Race: guest email matches existing Google user → account hijack | Medium | High | upsertGuestUser MUST NOT touch existing user's emailVerified. If existing user has `emailVerified != null` → guest checkout flow STILL works (uses their userId) — they get magic link to same email they own. Not a hijack because attacker must control that email. |
| User clicks magic link in different browser than checkout | Low | Low | Session cookie binds to clicked browser. Acceptable UX — they can still see purchases on /my/purchases. |

## Security Considerations

- **Token storage** — NextAuth uses hashed tokens in DB by default (`@auth/prisma-adapter`).
- **CSRF** — NextAuth's callback endpoint has built-in CSRF + state validation.
- **PII** — magic link emails contain user email in URL params (NextAuth default). Acceptable for v1. Audit if regulated industries needed later.
- **Anti-enumeration** — `signInWithEmailAction` returns `{ok: true}` regardless of whether email exists (NextAuth pattern). Don't leak "user not found".
- **Email content** — no sensitive data (no order details in subject); body has generic "đăng nhập" or "kích hoạt" text.

## Backwards Compatibility

- Additive only: existing Google OAuth flow unchanged.
- `VerificationToken` table already exists — no migration.
- Existing `events.createUser` hook (welcome email + affiliate attribution) fires for both Google sign-ups AND first-time email magic link sign-ups. Same behavior.
- Session strategy = "database" — compatible with both providers.
- If `FEATURE_MAGIC_LINK_ENABLED=false`, EmailProvider can be excluded conditionally from providers array → login page hides form section.

## Next Steps

- After Phase 0 ships, monitor: magic link send/click ratio (Resend dashboard); failed activation emails for guest checkouts.
- Future: OTP as alternative (Credentials provider with 6-digit code) for landing-page conversion experiments.
- Future: WebAuthn passkeys (NextAuth supports natively in v5).
- Cross-link with Phase 2: ensure `/cart` shows guest checkout form when no session.
