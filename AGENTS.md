<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# ⚠️ READ FIRST before planning features

Source of truth docs (in this repo):

1. **[`docs/roadmap.md`](docs/roadmap.md)** — full module status matrix (✅ / 🟡 / ❌ / 🚫). Update in-place when you ship something. Don't propose work that's already done.
2. **[`docs/competitor-analysis.md`](docs/competitor-analysis.md)** — Skool + Whop + TAIP.IO analysis. Product positioning (challenge-first), USPs (AI Agent, custom domain), feature inheritance. Future agents: re-read this before "should we do X?" questions.
3. **[`docs/module-challenges.md`](docs/module-challenges.md)** — detailed spec for the Challenge module (TAIP origin).
4. **[`docs/design-system.md`](docs/design-system.md)** — Discord-inspired visual tokens.
5. **[`docs/roles-permissions.md`](docs/roles-permissions.md)** — community OWNER / ADMIN / MOD / MEMBER permission matrix. Use `lib/community-permissions.ts`; do not add ad-hoc role checks.

These are git-tracked at `app/docs/`. Check commit history to understand when things shipped.

---

---

# focus.camp — Layout naming & rules (persistent memory)

## Shell terminology

Từ trái qua phải:

1. **community list** — dải 72px bên trái nhất, hiển thị danh sách icons community mà user tham gia + nút Discovery + nút home. File component: `components/shell/server-list.tsx` (class `.server-list` từ prototype).

2. **sidebar trái** / **sidebar tính năng chính** — cột ~260px kế tiếp, chứa banner community + features menu (Chat, Bảng tin, Khóa học, Challenge, Marketplace, AI Agent…). Tương ứng `<aside class="channel-sidebar">` trong community layout, hoặc `<HomeSidebar>` khi ở `/` + `/discovery`.

3. **vùng nội dung** / **content zone** — cột giữa (flex: 1), chứa view của feature đang được chọn. Là `<main class="main-content">` trong layout. Nhận children từ page route.

4. **sidebar phải** / **sidebar phụ** — cột ~372px bên phải. Trong community routes là parallel slot `@rightSidebar`.

## Behavior rules

- **community list + sidebar trái** (#1 + #2): LUÔN hiển thị cho user đã login, KHÔNG bao giờ ẩn. Chỉ đổi nội dung tuỳ context:
  - Ở `/` hoặc `/discovery` hoặc các route `(shell)` khác (tên gọi: **Điểm tập kết**) → `<HomeSidebar>` (menu Khám phá / Tài khoản / Về chúng tôi)
  - Ở `/c/[slug]/*` → community channel-sidebar (tên community + features menu + text channels list)

- **Nguyên tắc phân chia menu**:
  - **HomeSidebar (Điểm tập kết)** chỉ chứa nội dung **platform-level**: Discovery, Marketplace global, About/Manifesto/Direct Challenge/Brand (về focus.camp chứ không phải về 1 community), Profile global, Cài đặt global.
  - **Community sidebar** chỉ chứa nội dung **của community đó**: Chat, Bảng tin, Cốt, Tín hiệu, Hỏi đáp, Khóa học, Challenge, Bảng xếp hạng, Marketplace (của community), AI Agent (per-community). KHÔNG đặt triết học focus.camp, Brand Guide, About… trong đây — user đã có chỗ khác để xem (Điểm tập kết).

- **content zone** (#3): đổi theo feature đang chọn (page route).

- **sidebar phụ** (#4) — rule kỹ:
  - **Default**: hiển thị thông tin community (guest view: banner + tagline + stats + nút Tham gia + "What you'll get"; member view: banner + Tiến độ của bạn + Tiếp theo + Invite People + community info).
  - **Cách 1 — ẨN**: feature cần thêm không gian → slot render `null`. Ví dụ: `/courses` list.
  - **Cách 2 — BỔ TRỢ**: feature cần sidebar có context liên quan → slot render nội dung khác. Ví dụ: `/courses/[courseSlug]` → list video của course đó.

- **CRITICAL**: khi user navigate giữa các features, sidebar phụ PHẢI reset đúng — KHÔNG được giữ nội dung của feature cũ. Cụ thể, mỗi feature route cần có:
  - `@rightSidebar/<feature>/page.tsx` nếu muốn ẩn (return null) hoặc bổ trợ (render component).
  - Nếu KHÔNG có override, sẽ rơi xuống `@rightSidebar/default.tsx` (community info).
  - Phải đảm bảo **default.tsx tồn tại ở mọi cấp cần thiết** để fallback không bị stale slot từ page trước.

## Parallel route structure (`/c/[slug]/@rightSidebar/`)

```
@rightSidebar/
  default.tsx                       → CommunityRightSidebar (guest/member view)
  courses/
    default.tsx                     → fallback = null (hide)
    page.tsx                        → return null (hide on courses list)
    [courseSlug]/
      default.tsx                   → fallback (course playlist)
      page.tsx                      → CoursePlaylistSidebar
  chat/
    default.tsx                     → fallback to CommunityRightSidebar
  <other-feature>/
    default.tsx                     → fallback to CommunityRightSidebar
```

If a feature doesn't have its own sub-default.tsx, Next.js uses the nearest ancestor default.tsx. In practice we need a `default.tsx` anywhere the hierarchy diverges so the slot never stays stale from a sibling route.

## Design tokens (8-size scale)

- `--text-xs` 11px — labels, timestamps
- `--text-sm` 13px — captions, secondary
- `--text-base` 14px — body default, UI
- `--text-md` 16px — button, h4
- `--text-lg` 18px — h3, card title
- `--text-xl` 22px — h2, section header, **detail-page h1** (post detail, course detail, challenge detail, product detail)
- `--text-2xl` 28px — h1 của **hero/manifesto/landing/unique celebration**, NOT for repeated content (courses list item opens a new page with same layout — use text-xl)
- `--text-3xl` 36px — landing hero

**Quy tắc 28px**: 28px là "shouty". Chỉ dùng khi trang đó **unique trong session** (About, Direct Challenge, Home hero, completed celebration). Detail page của content lặp lại (/c/<slug>/p/<id>, /courses/<s>, /challenges/<s>) dùng 22px — vẫn nổi bật, không áp đảo.

**KHÔNG dùng inline pixel font-size ngoài 8 token này.**

## Color palette

- Primary CTA: `--brand-green` (#1B9E75)
- Fire accent (CHỈ dùng trong Manifesto): `#ff7043`
- Semantic: `--success`, `--warning`, `--danger`, `--info`

## Fonts

- `--font-heading` (Roboto) — h1-h6, buttons, labels
- `--font-body` (Arial) — body, UI text
- `--font-display` (Playfair Display italic) — quotes, manifesto, pull-quotes (chỉ chỗ đặc biệt)

## Spacing (4px base)

`--space-1` (4) → `--space-20` (80). Không dùng số lẻ ngoài scale.

---

# Infrastructure

## Service layer (`lib/services/`)
Mọi business logic đi qua đây, **không** gọi `prisma` trực tiếp từ pages.
- `community.ts` — getCommunity, join (transaction-wrapped), listMyCommunities
- `payment.ts` — startProductPurchase, matchSePayTransactionToPayment, getPaymentStatus

## Validation
Mọi input từ ngoài (webhook, server action form) đi qua schema trong `lib/validations.ts` (zod).

## Rate limit
`lib/rate-limit.ts` — in-memory per key. Áp dụng ít nhất cho: SePay webhook (60/phút/IP).
TODO: chuyển sang Upstash Redis khi scale multi-instance.

## Middleware
`middleware.ts` — kiểm tra auth cho mọi route không nằm trong PUBLIC_PREFIXES. Không login → redirect `/login?redirectTo=<path>`. Cũng thêm security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).

## Observability
- `lib/logger.ts` — pino structured logger, redact sensitive fields. Dev: pretty; prod: JSON.
- Sentry: set `SENTRY_DSN` trong `.env.production` để bật. `instrumentation.ts` + `sentry.*.config.ts` đã cài sẵn.
- `/api/health` — uptime endpoint, check DB, dùng cho uptime monitor.

## DB management
- **Migrations**: dùng `prisma migrate deploy` (không dùng `db push` cho prod).
- Script init 1 lần: `scripts/init-prisma-migrations.sh` — sinh baseline migration từ schema hiện tại + mark applied.
- **Backup**: `scripts/backup-db.sh` — chạy `pg_dump` mỗi ngày 3am, giữ 7 ngày. Cài cron trên VPS.

## Deploy
- Push main → GitHub Actions SSH vào VPS → `git pull && docker compose up -d --build`
- Sau khi code deploy ổn, chạy 1 lần `bash scripts/init-prisma-migrations.sh` trong container để chuyển sang migration-based DB management.

---

## ⚠️ Community Image Changes

Khi user yêu cầu AI đổi hình community (`iconUrl`, `bannerUrl`), PHẢI đi đúng flow:

1. **Download** hình từ URL user cung cấp
2. **Convert sang .webp** bằng `sharp` (quality 80) — giống logic trong `app/api/upload/route.ts`
3. **Upload lên R2** qua `uploadFile()` từ `lib/storage.ts` với key format: `community/<userId>/<timestamp>-<rand>.webp`
4. **Update DB** với public URL trả về từ R2

KHÔNG được:
- Ghi URL bên ngoài (imgur, discord CDN, google drive…) trực tiếp vào DB — file phải nằm trên R2
- Bỏ qua bước convert webp
- Dùng URL cũ mà không verify file tồn tại trên R2

Nếu không có quyền truy cập server/R2 credentials → hướng dẫn user vào UI: `/c/<slug>/settings` → "Community Info" → upload hình mới. Đây là thao tác đơn giản trên UI, không cần AI hỗ trợ.
