# External Member Webhook — Provision member + challenge từ landing page ngoài

**Mục tiêu:** LDP (landing page) gọi webhook sau khi khách thanh toán → focus.camp tạo user (email + tên, passwordless), join community free tier, enroll vào challenge chỉ định (không thu phí lại), gửi magic link đăng nhập.

**Branch:** tạo `feat/external-member-webhook` từ main.

---

## Quyết định thiết kế (đã chốt với owner)

- **Auth:** tái dùng model `ApiKey` có sẵn (tab Tích hợp). Mỗi LDP 1 key, có label, revoke được. Key đã bind `communityId` → community = chủ key.
- **Target động:** payload truyền `challengeSlug`; validate challenge thuộc community của key.
- **Scope mới:** thêm `provision_members` vào ApiKey scopes (least privilege — key webhook không lạm sang MCP write/admin).
- **Email:** `signIn("resend", { email, redirect: false })` — pattern đã chạy prod tại `app/login/page.tsx:36`. **Chỉ gửi magic link lần ĐẦU tạo account** (user mới); lần sau chỉ join thêm, không spam email khi LDP retry.
- **Challenge:** `joinChallenge()` land ACTIVE, KHÔNG set `personalStartsAt` (khách tự bấm "Bắt đầu").
- **Idempotency + audit:** bảng `ExternalMemberProvision` (unique theo `apiKeyId + externalOrderId`).

---

## Mảnh đã có sẵn (tái dùng, không build lại)

- `lib/api-keys.ts` → `resolveApiKey(bearer)` verify hash + revoked/expired
- `lib/services/community.ts` → `joinCommunity()` idempotent, transaction-wrapped
- `lib/services/challenge-member.ts` → `joinChallenge({userId, challengeId})` land ACTIVE, no payment
- `lib/rate-limit.ts` → `rateLimit()` + `getClientIp()`
- `auth.ts` Resend provider + `signIn("resend")`
- `app/api/sepay/webhook/route.ts` → khuôn mẫu route (auth header + ratelimit + zod + dedup)
- `components/settings/api-keys-panel.tsx` + `app/actions/api-keys.ts` → UI tạo/revoke key

---

## Status: ✅ implemented + e2e verified on branch `feat/external-member-webhook` (2026-06-05). NOT yet committed/deployed.

Code review done (0 CRITICAL; cross-community isolation + idempotency correct). Applied fixes: plan-gate on both paths → 409 `community_inactive` (M1/M2), per-key rate limit (H2), dropped `userId` from response (M3), documented dedupe semantics (L1). Deferred (need infra/product call): H1 per-key email budget (per-key 60/min limit mitigates), confirm prod proxy overwrites X-Forwarded-For.

## Phases

### Phase 1 — DB + scope
- `prisma/schema.prisma`: thêm model `ExternalMemberProvision` (id, apiKeyId, communityId, challengeId?, userId, email, externalOrderId, createdAt; `@@unique([apiKeyId, externalOrderId])`).
- Thêm `"provision_members"` vào danh sách scope hợp lệ (`lib/api-keys.ts` / nơi validate scopes + Zod `CreateApiKeySchema`).
- Migration: `prisma migrate dev --name external_member_provision`.
- **Verify:** `npx prisma validate` + `npx tsc --noEmit` sạch.

### Phase 2 — Service layer
- `lib/services/external-member.ts` → `provisionExternalMember({ apiKey, communityId, email, name, challengeSlug, externalOrderId })`:
  1. dedup: nếu `(apiKeyId, externalOrderId)` đã có → trả về kết quả cũ (idempotent).
  2. `upsert` User by email (set name nếu đang trống).
  3. `joinCommunity(userId, communityId)`.
  4. nếu `challengeSlug`: resolve challenge trong community → `joinChallenge()`. Validate challenge thuộc community.
  5. ghi `ExternalMemberProvision`.
  6. trả `{ userId, created, challengeJoined }`.
- Zod schema input trong `lib/validations.ts`.
- **Verify:** unit test service (idempotent gọi 2 lần = 1 member).

### Phase 3 — Webhook route
- `app/api/integrations/member/route.ts` (POST):
  1. `getClientIp` + `rateLimit({ key: "extmember:<ip>", limit: 60, windowSec: 60 })`.
  2. đọc `Authorization: Bearer fc_live_...` → `resolveApiKey` → check scope `provision_members`.
  3. zod validate body.
  4. gọi `provisionExternalMember()`.
  5. `signIn("resend", { email, redirect: false })` gửi magic link — **chỉ khi `created === true`** (user mới).
  6. response `{ ok: true, userId, challengeJoined }`. Lỗi → 401/400/429/500 như SePay route.
  - logger structured, không log secret.
- **Verify:** curl thử local với key thật → user + membership + challengeMember tạo đúng, gọi lại lần 2 không nhân đôi, email gửi.

### Phase 4 — UI tab Tích hợp (nhẹ)
- Trong `ApiKeysPanel` (hoặc panel kế bên): khi tạo key cho phép chọn scope `provision_members`; hiển thị **URL webhook** + **sample payload** + bảng log `ExternalMemberProvision` gần đây (label key + email + thời gian).
- **Verify:** owner tạo key, copy URL/sample, thấy log sau khi webhook chạy.

### Phase 5 — Review + docs
- `code-reviewer` agent trên toàn diff (focus: auth bypass, idempotency race, validate challenge↔community).
- Cập nhật `docs/roadmap.md` + ghi env/endpoint mới.

---

## Rủi ro & lưu ý

- `signIn("resend", redirect:false)` từ route handler: test 1 lần (pattern đã chạy ở server action login, kỳ vọng OK).
- Race condition khi 2 webhook cùng `externalOrderId` tới song song → dựa `@@unique` + catch P2002 (giống `joinCommunity`).
- Key bị lộ = tạo member free vô tội vạ → rate limit + revoke nhanh qua UI + scope hẹp.
- Email đã tồn tại (user thật) → upsert merge, thêm họ vào community. Đúng mong muốn.

## Câu hỏi mở
- Có giới hạn số challenge / payload truyền nhiều challenge cùng lúc không? (v1: 1 challenge)
- Có cần gửi magic link mỗi lần webhook lặp lại, hay chỉ lần đầu tạo? (đề xuất: chỉ lần `created`)
