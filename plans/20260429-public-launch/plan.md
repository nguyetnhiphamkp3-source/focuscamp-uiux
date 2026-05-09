# Public Launch Roadmap — focus.camp

**Date:** 2026-04-29
**Target launch:** ~2026-05-13 (2 tuần)
**Current state:** Soft beta ready. Public launch blocked by 6 items below.

## Sequencing rationale

Order = (impact ÷ effort) + dependency:
1. **Monetization** trước — revenue blocker, plan đã chốt, infra SePay sẵn
2. **Legal pages** ngay sau — compliance để bán được hàng
3. **Email transactional** đi cùng monetization (cần receipt, expiring email)
4. **Pricing + landing** (đóng loop conversion)
5. **Mobile responsive** (audience VN mobile-first)
6. **AI Agent MVP** cuối — biggest effort, USP nhưng không chặn revenue

---

## Phase 1 — Monetization (1.5 ngày) [P0]

**Status:** Plan đã chốt sản phẩm trước (Solo 99k / Pro 299k / Agency 799k VND/tháng, mua theo community, grandfather existing, grace 7d → read-only). Implement chưa làm.

**Files:**
- `prisma/schema.prisma`: `Community.planTier` (string enum SOLO/PRO/AGENCY/GRANDFATHER), `Community.planExpiresAt` (datetime?)
- `lib/platform-plans.ts` **NEW**: constants + `getPlanStatus()` + `canWrite()` helpers
- `lib/services/community.ts`: `createCommunity()` accept `planTier`, generate Payment record, status PENDING. Add `renewCommunityPlan()`.
- `lib/services/payment.ts`: handle `purpose='community_plan'` trong `matchSePayTransactionToPayment` — set `planExpiresAt = now + 30d`
- `app/c/[slug]/layout.tsx`: compute `planStatus`, gate write ở actions, banner warning khi grace
- `components/shell/create-community-button.tsx`: thêm step chọn gói
- `components/community/plan-status-banner.tsx` **NEW**: banner + nút gia hạn
- `components/settings/community-plan-panel.tsx` **NEW**: section "Gói" trong settings
- `lib/services/post.ts` + `challenge-member.ts` + `course.ts`: thêm `assertCommunityCanWrite()` guard
- `scripts/grandfather-communities.sh` **NEW**: 1-shot SQL chạy 1 lần sau deploy

**Verification:**
- Create community mới → redirect `/pay/<code>` → SePay → community ACTIVE
- Set `planExpiresAt = past` → createPost throw "plan hết hạn"
- Owner thấy banner gia hạn ở grace
- Existing communities (The All In Plan) → planTier=GRANDFATHER, không bị chặn

---

## Phase 2 — Legal pages (0.5 ngày) [P0]

**Files NEW:**
- `app/(shell)/terms/page.tsx` — Điều khoản dịch vụ
- `app/(shell)/privacy/page.tsx` — Chính sách bảo mật
- `app/(shell)/refund/page.tsx` — Chính sách hoàn tiền
- `app/(shell)/about/page.tsx` (đã có — verify nội dung)

**Content notes:**
- ToS: gốc TermsFeed/Termly/iubenda template, dịch + edit cho VN context
- Privacy: liệt kê data thu thập (email Google, IP, content posted, payment via SePay), R2 storage, retention
- Refund: SePay one-time payment, 7d refund cho subscription nếu không dùng (chưa post/checkin), không refund nếu đã consume
- Footer link cho 3 trang trên trong `home-sidebar.tsx` + `community-right-sidebar.tsx`

**Compliance:**
- Cookie banner: optional v1 (Google OAuth không cookie tracking ngoài auth)
- Email contact bắt buộc — dùng `support@focus.camp` (cần setup forward)

**Verification:**
- 3 trang accessible không cần login
- Link footer đúng
- Search engine indexable

---

## Phase 3 — Email transactional (1 ngày) [P0]

**Existing:** `lib/email.ts` đã có Resend wrapper.

**What to add:**

1. `lib/email-templates.ts` **NEW** — 6 functions trả về `{ subject, html, text }`:
   - `welcomeEmail({ name })` — sau khi signup Google lần đầu
   - `paymentReceiptEmail({ amount, communityName, planTier, expiresAt, txId })` — sau webhook match
   - `subscriptionExpiringEmail({ communityName, daysLeft, renewUrl })` — cron 7d trước expire
   - `subscriptionExpiredEmail({ communityName, renewUrl })` — khi qua expiresAt
   - `challengeJoinedEmail({ communityName, challengeName, day1Url })` — sau join challenge
   - `refundProcessedEmail({ amount, reason })` — manual trigger

2. **Wire-up:**
   - `auth.ts` callback `events.signIn` → first-time → `sendEmail(welcomeEmail(...))`
   - `lib/services/payment.ts` → sau khi activate → send receipt
   - Cron job (vercel cron hoặc node-cron container side): mỗi ngày 9am check `Community.planExpiresAt BETWEEN now AND now+7d` → send expiring
   - `lib/services/challenge-member.ts` → joinChallenge → send onboarding email

3. **Branding template:** dùng simple HTML inline-style (Resend best practice), logo top, brand green CTA, Vietnamese copy

**Files:**
- `lib/email-templates.ts` **NEW**
- `lib/email.ts` (existing, không đổi)
- `auth.ts` — events.signIn handler
- `lib/services/payment.ts` — gọi sau activate
- `scripts/send-expiring-emails.ts` **NEW** — cron entry
- `.github/workflows/cron-emails.yml` **NEW** — daily 9am UTC+7

**Verification:**
- Tạo user mới → check inbox welcome
- Pay test → check receipt
- Set planExpiresAt = +5d → run cron script → check expiring email

---

## Phase 4 — Pricing + landing public (1 ngày) [P1]

**Files:**
- `app/(public)/pricing/page.tsx` **NEW** — 3 card gói + FAQ + nút CTA mở create-community modal
- `app/(public)/page.tsx` (override `/`): landing public cho user CHƯA login
  - Hero "Build your tribe with focused challenges"
  - 3 USP: Challenge-first, AI Agent, Custom domain
  - Social proof (logos / quotes — fake hoặc skip)
  - Pricing preview link → `/pricing`
  - CTA "Bắt đầu miễn phí" → `/login`
- `middleware.ts` — `/pricing` thêm vào PUBLIC_PREFIXES
- Logged-in user vào `/` → redirect `/discovery` (giữ behavior cũ)

**Verification:**
- Logout → vào `/` → thấy landing
- Click "Pricing" → 3 card
- Click "Chọn Pro" → redirect login → sau login → mở create modal pre-filled tier

---

## Phase 5 — Mobile responsive (2-3 ngày) [P1]

**Audit 5 critical pages first (track by % traffic):**
1. `/` (landing + discovery)
2. `/login`
3. `/c/<slug>` (community landing)
4. `/c/<slug>/feed`
5. `/c/<slug>/challenges/<slug>` + checkin form
6. `/pay/<code>` (SePay QR)

**Layout strategy:**
- Current shell `community-shell` 4-column flex breaks <900px
- Mobile (<768px): drawer pattern
  - Left sidebar collapse → hamburger menu
  - Right sidebar collapse → bottom sheet hoặc skip
  - Content full-width
- Tablet (768-1024px): 2 column (left sidebar collapsed icon-only, right sidebar hidden)

**Files:**
- `app/prototype.css` — add @media queries cho `.community-shell`, `.left-section`, `.main-content`, sidebar widths
- `components/shell/community-shell-mobile.tsx` **NEW** — hamburger + drawer
- Audit 10-15 inline `style={{}}` ở các page chính, thay px cố định bằng max-width / clamp
- `app/c/[slug]/layout.tsx` — wrap server-list trong `<MobileDrawer>`

**Approach:** không refactor toàn bộ — chỉ fix 5 page critical. Phase 2 sau launch sẽ polish.

**Verification:**
- Chrome DevTools device toolbar: iPhone 12 (390x844), Pixel 5 (393x851), iPad (768x1024)
- Check golden path: signup → join → checkin trên mobile
- Lighthouse mobile score >70

---

## Phase 6 — AI Agent MVP (5-7 ngày) [P1]

**Scope MVP:**
- 1 trang `/c/<slug>/agent`: chat interface
- Streaming response (Vercel AI SDK + OpenAI/Anthropic)
- System prompt per-community (owner cấu hình trong settings)
- Message persistence per user (table `AgentMessage`)
- Quota: 50 messages/day cho EXPLORER, unlimited cho BUILDER+
- KHÔNG tool calling v1 (defer)
- KHÔNG document RAG v1 (defer)

**Schema:**
- `AgentConversation` (userId, communityId, createdAt, updatedAt)
- `AgentMessage` (conversationId, role: user|assistant, content, createdAt)

**Files:**
- `prisma/schema.prisma` — 2 models
- `lib/ai/agent.ts` **NEW** — wrap Vercel AI SDK
- `lib/services/agent.ts` **NEW** — quota check, persist messages
- `app/api/agent/chat/route.ts` **NEW** — streaming endpoint
- `app/c/[slug]/agent/page.tsx` — full chat UI
- `components/agent/chat-input.tsx`, `message-list.tsx`, `message-bubble.tsx`
- `components/settings/agent-config-editor.tsx` — owner edit system prompt

**Cost guard:**
- Hard cap per community: 1000 messages/day
- Use Haiku 4.5 default (cheap), Pro tier có thể switch Sonnet
- Track tokens via `XPLedger` style table `AgentUsage`

**Verification:**
- Owner setup system prompt → save
- Member gửi message → streaming chữ chạy
- 50 msg → block với error "đã hết quota hôm nay"
- Persist: refresh trang → conversation hiện lại

---

## Cross-cutting tasks (làm song song)

| Task | Effort | Phase |
|---|---|---|
| Custom 404/500 page | 1h | bất kỳ |
| Open Graph meta tags | 2h | Phase 4 |
| robots.txt + sitemap | 1h | Phase 4 |
| PostHog analytics | 2h | Phase 1 song song |
| Rate limit cho createPost / createChallenge / checkin | 2h | Phase 1 song song |
| Backup restore drill (verify pg_dump) | 1h | trước launch |
| Setup Zalo / email support channel | 30m | trước beta |
| Update `docs/roadmap.md` mỗi phase | 10m × 6 | mỗi phase |

---

## Total estimate

- **Phase 1-3 (must-have for revenue + compliance):** 3 ngày
- **Phase 4-5 (conversion + audience):** 3-4 ngày
- **Phase 6 (USP differentiation):** 5-7 ngày
- **Cross-cutting:** 1 ngày spread

**Realistic target:** 2 tuần solo dev, 8 ngày nếu skip Phase 6 (delay AI Agent post-launch).

## Decision: ship sequence

**Option A — full feature (2 tuần):** Tất cả phase rồi launch.
**Option B — phased launch (1 tuần MVP, AI sau):** Phase 1-5 → launch public, AI Agent ship sau 1-2 tuần.

**Recommend Option B.** Lý do: revenue trước, AI là upsell pull-feature có thể tease "Coming soon — beta access". Launch sớm có user, có feedback, mới biết ai cần AI thực sự.

## Out of scope (post-launch)

- Custom domain per community (USP nhưng không blocker)
- Admin moderation dashboard
- Native mobile app
- Webhooks / API keys cho 3rd party agent
- Multi-language (chỉ tiếng Việt v1)
- Affiliate program
- White-label cho Agency tier
- Auto-renew SePay (manual QR mỗi tháng v1)
- Refund self-serve UI (manual qua DB v1)

---

## Acceptance criteria for "ready to public launch"

- [ ] User mới signup → nhận welcome email
- [ ] User tạo community → bắt buộc chọn gói + pay → community active
- [ ] Owner thấy banner gia hạn 7d trước expire
- [ ] Plan hết hạn 8d → community read-only
- [ ] 3 trang legal accessible
- [ ] `/pricing` show 3 gói, click mua → flow đúng
- [ ] Mobile golden path không bị vỡ
- [ ] PostHog tracking signup / create_community / payment_completed
- [ ] Rate limit ngăn được spam (test 100 req/min/user trên createPost → block)
- [ ] Backup restore từ pg_dump verified trên VPS staging

Tick hết = ready public launch.
