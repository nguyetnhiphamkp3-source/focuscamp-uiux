# Security Scan Report — focus.camp

**Project:** focus.camp (Next.js 15 + Prisma + PostgreSQL)
**Scanned:** 2026-05-01
**Scope:** `app/` (excluded `node_modules/`, `.next/`, `.claude/`, `.opencode/`, `plans/`)
**Method:** `/ck:security-scan` — grep-based pattern detection + Claude reasoning + `pnpm audit`

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|---------:|-----:|-------:|----:|
| Hardcoded secrets | 0 | 0 | 0 | 0 |
| Dependencies | 0 | 0 | 5 | 0 |
| Code patterns | 0 | 2 | 4 | 3 |
| **Total** | **0** | **2** | **9** | **3** |

Sạch về secrets — không có hardcoded API keys, tokens, hoặc credentials trong source. `.env` được gitignore đúng. SePay webhook auth chuẩn. Tuy nhiên có 2 vấn đề HIGH cần fix sớm và 9 issue MEDIUM nên xử lý.

---

## HIGH

### 1. Telegram webhook fail-open khi thiếu env secret
**File:** [app/api/telegram/webhook/route.ts:54-59](app/api/telegram/webhook/route.ts#L54-L59)

```ts
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
// ...
if (WEBHOOK_SECRET) {
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (got !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
  }
}
```

**Impact:** Nếu `TELEGRAM_WEBHOOK_SECRET` không set (hoặc rỗng), endpoint chấp nhận MỌI POST request. Attacker có thể:
- Forge Telegram updates → trigger `/start <code>` để link tài khoản trái phép (steal account binding)
- Spam AI agent qua webhook → tốn quota Anthropic
- Inject message vào AgentConversation của user khác (nếu biết telegramUserId)

**Fix:**
```ts
if (!WEBHOOK_SECRET) {
  logger.error("[telegram] TELEGRAM_WEBHOOK_SECRET not set");
  return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
}
const got = req.headers.get("x-telegram-bot-api-secret-token");
if (got !== WEBHOOK_SECRET) {
  return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
}
```

So sánh với `app/api/sepay/webhook/route.ts:35-41` — đã làm đúng pattern này.

---

### 2. SQL injection vector trong search service
**File:** [lib/services/search.ts:80-117](app/lib/services/search.ts#L80-L117)

```ts
async function searchPostsFts(tsq: string, limit: number, communityId?: string) {
  const communityFilter = communityId
    ? `AND p."communityId" = '${communityId}'`     // ← string interpolation
    : "";
  return prisma.$queryRawUnsafe<...>(
    `SELECT ... FROM "Post" p
     WHERE p."searchVector" @@ to_tsquery('simple', $1)
     ${communityFilter}                            // ← injected here
     ORDER BY ... LIMIT $2`,
    tsq,
    limit,
  );
}
```

**Impact:** `tsq` và `limit` đã được parameterize đúng ($1, $2), NHƯNG `communityId` interpolate trực tiếp. Hiện tại caller duy nhất ở `app/(shell)/search/page.tsx:22` không pass `communityId` — nên vector này dormant. Nhưng:
- Dev tương lai gọi `searchAll({ query, communityId: searchParams.get('c') })` sẽ mở SQL injection ngay
- Attacker có thể inject `' OR 1=1 --` để dump posts toàn platform

**Fix:** parameterize `communityId` thành `$3`:
```ts
const args: unknown[] = [tsq, limit];
let communityClause = "";
if (communityId) {
  args.push(communityId);
  communityClause = `AND p."communityId" = $${args.length}`;
}
return prisma.$queryRawUnsafe(`...${communityClause}...`, ...args);
```

---

## MEDIUM

### 3. Dependencies: 5 moderate vulnerabilities (transitive)

| Package | Path | Vuln | Fix |
|---|---|---|---|
| fast-xml-parser <5.7.0 | `@aws-sdk/client-s3 → ... → fast-xml-parser` | XML comment/CDATA injection (CVE-2026-41650, CVSS 6.1) | `pnpm up @aws-sdk/client-s3` |
| uuid <14.0.0 | `bullmq → uuid`, `resend → svix → uuid` | Buffer bounds bypass (GHSA-w5hq-g745-h8pq) | `pnpm up bullmq resend` |
| postcss <8.5.10 | `@tailwindcss/postcss → postcss`, `next → postcss` | XSS via `</style>` (GHSA-qx2v-qp2m-jg93) | Update Next.js + Tailwind |

Risk thấp vì transitive và Next.js handles output escaping, nhưng nên `pnpm audit fix` định kỳ.

### 4. Insecure randomness trong payment code
**File:** [lib/sepay.ts:17-24](app/lib/sepay.ts#L17-L24)

```ts
export function generatePaymentCode(prefix = "FC"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];   // ← Math.random
  }
  return `${prefix}${suffix}`;
}
```

**Impact:** Math.random không cryptographically secure. Code này dùng để match SePay transaction → activate Purchase. Predictability low (32^8 ≈ 10^12 space) nhưng không nên dùng cho payment-related identifier.

**Fix:**
```ts
import { randomBytes } from "crypto";
// Inside function:
const buf = randomBytes(8);
let suffix = "";
for (let i = 0; i < 8; i++) {
  suffix += chars[buf[i] % chars.length];
}
```

### 5. Upload size không enforce server-side
**File:** [app/api/upload/route.ts:113-126](app/api/upload/route.ts#L113-L126)

`MAX_FILE_SIZES` được declare nhưng presigned URL không có `Content-Length-Range` condition. Client có thể upload file lớn hơn limit.

**Impact:** Storage abuse — user upload 10GB vào avatar context đáng ra max 2MB. Tăng cost R2 + có thể fill bucket.

**Fix:** dùng `createPresignedPost` với policy condition thay vì `getSignedUrl` của S3 v3:
```ts
const post = await createPresignedPost(s3Client, {
  Bucket: bucket,
  Key: key,
  Conditions: [
    ["content-length-range", 0, MAX_FILE_SIZES[context]],
    ["eq", "$Content-Type", contentType],
  ],
  Expires: 600,
});
```

### 6. CSP allows `unsafe-eval`
**File:** [middleware.ts:88](app/middleware.ts#L88)

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

Next.js dev mode cần `unsafe-eval`, nhưng prod thì không nhất thiết. `unsafe-inline` là yêu cầu của Next.js inline scripts.

**Fix:** check Next.js docs — prod build có thể bỏ `unsafe-eval` nếu không xài Webpack `eval` source maps. Test thử rồi remove.

### 7. `application/octet-stream` cho phép trong upload
**File:** [app/api/upload/route.ts:25](app/api/upload/route.ts#L25)

```ts
const FILE_TYPES = new Set([
  "application/pdf",
  ...
  "application/octet-stream",   // ← any binary
  ...
]);
```

`application/octet-stream` là fallback MIME, attacker có thể upload `.exe`, `.sh`, `.dll` mà server không block. R2 không execute, nhưng nếu user serve lại file qua proxy (custom domain) browser có thể download executable.

**Fix:** remove `application/octet-stream` hoặc thay bằng whitelist cụ thể (ví dụ chỉ Office docs, archives, media).

### 8. Missing rate limit trên `/api/email/test`
**File:** [app/api/email/test/route.ts](app/api/email/test/route.ts)

Endpoint chỉ check owner email. Nếu owner account bị compromise, attacker có thể spam Resend bằng GET `/api/email/test?to=victim@example.com` không rate limit.

**Fix:** thêm rate limit như upload route:
```ts
const rl = await rateLimit({ key: `email-test:${session.user.id}`, limit: 5, windowSec: 300 });
if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
```

---

## LOW

### 9. Math.random cho upload key suffix
**File:** [app/api/upload/route.ts:110](app/api/upload/route.ts#L110)

`Math.random().toString(36).slice(2, 8)` — dùng để tránh collision khi user upload cùng timestamp. Không security-critical (key không phải secret), chỉ collision avoidance. Có thể dùng `randomBytes(3).toString('hex')` cho consistency nhưng không bắt buộc.

### 10. CSP `connect-src 'self' https:` quá rộng
**File:** [middleware.ts:88](app/middleware.ts#L88)

Cho phép XHR/fetch tới mọi HTTPS endpoint. Nếu xảy ra XSS, attacker có thể exfil data đến server của họ.

**Fix:** hẹp hơn:
```
connect-src 'self' https://api.anthropic.com https://*.r2.cloudflarestorage.com https://api.resend.com https://api.sepay.vn;
```

### 11. CSRF — verify Next.js Server Actions config
Next.js 15 mặc định có Origin check cho server actions, nhưng nên verify `experimental.serverActions.allowedOrigins` trong `next.config.js` đúng (chỉ `focus.camp`). Nếu không set, có thể bypass với forwarded request.

---

## Recommendations (priority order)

1. **[NOW]** Fix Telegram webhook fail-open (#1) — 5 phút edit
2. **[NOW]** Parameterize search SQL (#2) — 10 phút edit
3. **[THIS WEEK]** `pnpm audit fix` (#3), payment code → crypto.randomBytes (#4), upload size enforce (#5)
4. **[THIS MONTH]** Remove `octet-stream` (#7), add rate limit email/test (#8), narrow CSP (#10)
5. **[BACKLOG]** CSP without unsafe-eval (#6), CSRF verify (#11), upload key consistency (#9)

---

## Out of scope (would need separate runs)

- Penetration testing / runtime security
- Infrastructure (Docker, VPS firewall, R2 ACL, DB user permissions)
- Compliance audit (GDPR, PDPA)
- Auth flow deep review (PKCE, session fixation, OAuth state validation)
- Race conditions in payment matching / referral attribution
- Business logic auth (e.g. course tier gating bypass attempts)

---

## Files scanned
- 12 API routes (`app/api/**/route.ts`)
- All `lib/services/`, `lib/`
- `middleware.ts`, `auth.ts`
- `prisma/schema.prisma` (config)
- Excluded: `node_modules/`, `.next/`, `plans/`, `.claude/`, `.opencode/`, dotfiles
